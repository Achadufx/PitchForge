import { callGemini } from './geminiClient';
import { extractJson } from './extractJson';

// Normalizes to an array of non-empty strings. Gemini is instructed to use null
// for unknown fields, and pages/api/research-and-pitch.js calls .some() on these
// — so a null here previously threw TypeError and killed the whole request.
function toStringArray(value) {
  if (value == null) return [];
  var arr = Array.isArray(value) ? value : [value];
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] == null) continue;
    var s = typeof arr[i] === 'string' ? arr[i].trim() : String(arr[i]).trim();
    if (s && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'unknown') out.push(s);
  }
  return out;
}

function toStringOrNull(value) {
  if (value == null) return null;
  var s = typeof value === 'string' ? value.trim() : String(value).trim();
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'unknown') return null;
  return s;
}

function toBool(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'string') {
    var s = value.trim().toLowerCase();
    if (s === 'true' || s === 'yes') return true;
    if (s === 'false' || s === 'no') return false;
  }
  return null;
}

export async function researchInvestor(investorName, firm) {
  if (!investorName) {
    console.error('researchInvestor: investorName is required');
    return null;
  }

  var who = investorName + (firm ? ' at ' + firm : '');

  // Maximizes the facts that make a pitch specific and credible: named deals with
  // years, verbatim quotes, stated anti-patterns, and warm-intro surface area.
  var prompt = 'You are a venture capital research analyst. Profile this investor: ' + who + '.\n\n' +
    'Return ONLY a JSON object matching this exact schema:\n' +
    '{\n' +
    '  "thesis": "their investment thesis in 1-2 sentences, in their own words where possible",\n' +
    '  "recentDeals": ["Company (year, round)", "Company (year, round)"],\n' +
    '  "checkSize": "typical first-check range, e.g. $250K-$1M",\n' +
    '  "stagePreference": ["pre-seed", "seed"],\n' +
    '  "geographyFocus": ["US", "Africa"],\n' +
    '  "sectorFocus": ["healthtech", "fintech"],\n' +
    '  "portfolioHighlights": ["their most recognizable investments"],\n' +
    '  "publicQuote": "one real sentence they said publicly, verbatim, about investing or a sector",\n' +
    '  "quoteSource": "where that quote came from, e.g. podcast/blog/interview name",\n' +
    '  "thesisKeywords": ["3-6 distinctive words or phrases they actually use"],\n' +
    '  "whatTheyLookFor": ["concrete signals they say they want in a founder or company"],\n' +
    '  "antiPatterns": ["things they have said they avoid or pass on"],\n' +
    '  "boardSeats": ["companies where they sit on the board"],\n' +
    '  "coInvestors": ["funds they frequently co-invest with"],\n' +
    '  "warmIntroPaths": ["types of people likely to have a real connection to them"],\n' +
    '  "recentActivity": "most recent notable thing they did, with a date if known",\n' +
    '  "scoreFactors": {\n' +
    '    "investsInHealth": true,\n' +
    '    "investsInAfrica": false,\n' +
    '    "investsInDataPrivacy": false,\n' +
    '    "activeLast12Months": true\n' +
    '  },\n' +
    '  "confidence": "high | medium | low — how confident you are this is the right person",\n' +
    '  "isRealPerson": true\n' +
    '}\n\n' +
    'HARD RULES:\n' +
    '- Never invent a deal, quote, number, or date. Fabricated facts are worse than missing ones,\n' +
    '  because they will be pasted into a real email to this person.\n' +
    '- Use null for any unknown string field and [] for any unknown array. Do not guess.\n' +
    '- publicQuote must be a real verbatim quote or null. Never paraphrase into the quote field.\n' +
    '- If you cannot confidently identify this person, set isRealPerson to false and confidence to "low".\n' +
    '- Prefer specific over general: "Series A in Flutterwave (2021)" beats "invests in fintech".';

  var result;
  try {
    // Budget is shared with thinking tokens on reasoning models. This schema has
    // ~19 fields, so a truncated response means unparseable JSON — the header
    // comment in lib/geminiClient.js explains the interaction.
    result = await callGemini({
      prompt: prompt,
      temperature: 0.2,
      maxOutputTokens: 4096,
      timeoutMs: 14000,
      // Caps request + rate-limit backoff. research-and-pitch runs this, a 3s
      // inter-call delay, and generatePitch inside one 60s Vercel invocation.
      // Deliberately below the 15s first backoff step + 3s reserve, so research
      // never starts a sleep it cannot finish — it returns 429 fast and lets the
      // client (no execution limit) carry the wait instead.
      deadlineMs: 16000,
      jsonMode: true,
      label: 'researchInvestor'
    });
  } catch (err) {
    console.error('researchInvestor: unexpected error calling Gemini for ' + who + ': ' +
      (err && err.message ? err.message : String(err)));
    return null;
  }

  if (!result.ok) {
    // Research is best-effort — the pitch can still be written without it — so a
    // rate limit here is logged loudly but does not abort the request.
    if (result.rateLimited) {
      console.error('researchInvestor: RATE LIMITED researching ' + who +
        ' — Gemini free-tier quota exhausted after ' + (result.retryAttempts || 0) +
        ' retries. Continuing without research; the pitch will avoid invented specifics.');
      return null;
    }
    console.error('researchInvestor: Gemini call failed for ' + who + ' — ' + result.error);
    return null;
  }

  var parsed;
  try {
    parsed = extractJson(result.text);
  } catch (err) {
    console.error('researchInvestor: JSON extraction threw for ' + who + ': ' +
      (err && err.message ? err.message : String(err)));
    return null;
  }

  if (!parsed) {
    console.error('researchInvestor: could not parse JSON for ' + who +
      '. Raw output (first 300 chars): ' + String(result.text).substring(0, 300));
    return null;
  }

  try {
    var rawFactors = parsed.scoreFactors && typeof parsed.scoreFactors === 'object' ? parsed.scoreFactors : {};

    var research = {
      thesis: toStringOrNull(parsed.thesis),
      recentDeals: toStringArray(parsed.recentDeals),
      checkSize: toStringOrNull(parsed.checkSize),
      stagePreference: toStringArray(parsed.stagePreference),
      geographyFocus: toStringArray(parsed.geographyFocus),
      sectorFocus: toStringArray(parsed.sectorFocus),
      portfolioHighlights: toStringArray(parsed.portfolioHighlights),
      publicQuote: toStringOrNull(parsed.publicQuote),
      quoteSource: toStringOrNull(parsed.quoteSource),
      thesisKeywords: toStringArray(parsed.thesisKeywords),
      whatTheyLookFor: toStringArray(parsed.whatTheyLookFor),
      antiPatterns: toStringArray(parsed.antiPatterns),
      boardSeats: toStringArray(parsed.boardSeats),
      coInvestors: toStringArray(parsed.coInvestors),
      warmIntroPaths: toStringArray(parsed.warmIntroPaths),
      recentActivity: toStringOrNull(parsed.recentActivity),
      scoreFactors: {
        investsInHealth: toBool(rawFactors.investsInHealth),
        investsInAfrica: toBool(rawFactors.investsInAfrica),
        investsInDataPrivacy: toBool(rawFactors.investsInDataPrivacy),
        activeLast12Months: toBool(rawFactors.activeLast12Months)
      },
      confidence: toStringOrNull(parsed.confidence) || 'low',
      isRealPerson: toBool(parsed.isRealPerson) !== false,
      investorName: investorName,
      firm: firm || null,
      model: result.model,
      researchedAt: new Date().toISOString()
    };

    // Counts only the facts a pitch can actually cite.
    var citable = 0;
    if (research.thesis) citable++;
    if (research.publicQuote) citable++;
    citable += research.recentDeals.length;
    citable += research.portfolioHighlights.length;
    citable += research.whatTheyLookFor.length;
    if (research.recentActivity) citable++;
    research.citableFactCount = citable;

    if (!research.isRealPerson) {
      console.warn('researchInvestor: Gemini could not confidently identify "' + who +
        '" — pitch will avoid fabricated specifics.');
    }

    console.log('researchInvestor: done for ' + who + ' | citable facts: ' + citable +
      ' | confidence: ' + research.confidence + ' | model: ' + result.model);
    return research;

  } catch (err) {
    console.error('researchInvestor: normalization failed for ' + who + ': ' +
      (err && err.message ? err.message : String(err)));
    return null;
  }
}

export default researchInvestor;
