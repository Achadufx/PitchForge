import { callGroq } from './groqClient';

function nonEmptyArray(value) {
  if (!value) return [];
  if (!Array.isArray(value)) return [];
  var out = [];
  for (var i = 0; i < value.length; i++) {
    if (value[i] == null) continue;
    var s = String(value[i]).trim();
    if (s) out.push(s);
  }
  return out;
}

// Strips a trailing parenthetical so "Flutterwave (2021, Series A)" yields
// "Flutterwave" — the form that actually appears inside a sentence.
function bareName(value) {
  return String(value == null ? '' : value).replace(/\s*[\(\[].*$/, '').trim();
}

// Normalizes for comparison: lowercase, straighten curly quotes, drop the
// punctuation models routinely re-style, collapse whitespace.
function normalizeForMatch(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// The opening: skips the greeting line, then takes roughly the first two
// sentences — the span the portability test actually judges.
function openingText(body) {
  var lines = String(body == null ? '' : body).split('\n');
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i].trim();
    if (!l) continue;
    if (!out.length && /^(hi|hey|hello|dear)\b/i.test(l)) continue;
    out.push(l);
    var sentences = out.join(' ').split(/[.!?]/).filter(function (s) { return s.trim(); });
    if (sentences.length >= 2) break;
  }
  return out.join(' ');
}

// True when the opening contains a proper noun unique to this investor — the fund
// name, a portfolio company, or a company they invested in. A thesis restatement
// or sector description deliberately does NOT count: that is precisely the
// portable, could-be-anyone opening the test exists to catch.
function openingUsesAnchor(body, anchors) {
  if (!anchors || !anchors.length) return true;
  var opening = openingText(body);
  if (!opening) return false;
  var normalizedOpening = normalizeForMatch(opening);

  for (var i = 0; i < anchors.length; i++) {
    var name = normalizeForMatch(anchors[i] && anchors[i].value);
    if (name && normalizedOpening.indexOf(name) !== -1) return true;
  }
  return false;
}

// True when the opening puts a substantial span in quotation marks. Openings must
// not quote the investor at all now, so any quoted sentence there is either an
// invented attribution or the old quote-led style resurfacing.
function openingHasQuotedSpan(body) {
  var opening = openingText(body);
  return /["“][^"”]{15,}["”]/.test(opening);
}

// True when the text reads as a finished email rather than one cut off mid-flow.
// A sign-off line ("Best," / "— Sam") legitimately has no terminal punctuation,
// so the check looks at the last line with real sentence content.
function looksComplete(body) {
  var text = String(body == null ? '' : body).trim();
  if (!text) return false;

  var lines = text.split('\n');
  var lastMeaningful = '';
  for (var i = lines.length - 1; i >= 0; i--) {
    var line = lines[i].trim();
    if (!line) continue;
    // Skip short trailing sign-off lines: "Best,", "Thanks", "- Sam", "Sam".
    var isSignOff = line.length <= 40 && (/,$/.test(line) || line.split(/\s+/).length <= 4);
    if (isSignOff) continue;
    lastMeaningful = line;
    break;
  }

  // Whole body was sign-off-like: too thin to be a real pitch.
  if (!lastMeaningful) return false;

  // Must end on terminal punctuation. A trailing quote/paren after it is fine.
  return /[.!?][")'”’]?$/.test(lastMeaningful);
}

function firstLine(text) {
  var lines = String(text).split('\n');
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i].trim();
    if (l) return l;
  }
  return '';
}

// Strips leading label noise ("Subject:", "**Subject**", bracket wrappers, quotes)
// that models add even when told not to.
function cleanSubject(raw) {
  var s = String(raw == null ? '' : raw).trim();
  s = s.replace(/\*\*/g, '');
  s = s.replace(/^-{2,}\s*SUBJECT\s*-{2,}\s*/i, '');
  s = s.replace(/^subject\s*(line)?\s*[:\-–]\s*/i, '');
  s = s.replace(/^\[+\s*/, '').replace(/\s*\]+$/, '');
  s = s.replace(/^["'“”]+/, '').replace(/["'“”]+$/, '');
  s = s.split('\n')[0].trim();
  return s;
}

function cleanBody(raw) {
  var b = String(raw == null ? '' : raw);
  b = b.replace(/^-{2,}\s*BODY\s*-{2,}\s*/gim, '');
  b = b.replace(/-{2,}\s*SUBJECT\s*-{2,}[^\n]*\n?/gi, '');
  b = b.replace(/^body\s*[:\-–]\s*/i, '');
  b = b.replace(/-{3,}\s*$/g, '');
  b = b.replace(/^\[+\s*/, '').replace(/\s*\]+$/, '');
  b = b.replace(/\n{3,}/g, '\n\n');
  return b.trim();
}

// Layered recovery so a format deviation degrades instead of returning null:
//   1. exact ---SUBJECT--- / ---BODY--- markers
//   2. loose markers (**Subject:**, "Subject -", bare "Subject:")
//   3. first line as subject, remainder as body
function parseSubjectAndBody(text, startupName) {
  var raw = String(text == null ? '' : text).trim();
  if (!raw) return null;

  var subject = '';
  var body = '';

  var strictSubject = raw.match(/-{2,}\s*SUBJECT\s*-{2,}\s*\n?([^\n]+)/i);
  var strictBody = raw.match(/-{2,}\s*BODY\s*-{2,}\s*\n?([\s\S]+)$/i);

  if (strictSubject && strictSubject[1]) subject = cleanSubject(strictSubject[1]);
  if (strictBody && strictBody[1]) body = cleanBody(strictBody[1]);

  if (!subject) {
    var looseSubject = raw.match(/^\s*(?:\*\*)?\s*subject\s*(?:line)?\s*(?:\*\*)?\s*[:\-–]\s*(.+)$/im);
    if (looseSubject && looseSubject[1]) subject = cleanSubject(looseSubject[1]);
  }

  if (!body) {
    var looseBody = raw.match(/^\s*(?:\*\*)?\s*body\s*(?:\*\*)?\s*[:\-–]\s*([\s\S]+)$/im);
    if (looseBody && looseBody[1]) {
      body = cleanBody(looseBody[1]);
    } else if (subject) {
      // Everything after the line that held the subject.
      var idx = raw.indexOf(subject);
      if (idx !== -1) {
        var after = raw.slice(idx + subject.length);
        after = after.replace(/^[\s\]"'”]*\n?/, '');
        body = cleanBody(after);
      }
    }
  }

  // Last resort: treat the first line as the subject if it reads like one.
  if (!body) {
    var lines = cleanBody(raw).split('\n');
    var head = '';
    var headIndex = -1;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim()) { head = lines[i].trim(); headIndex = i; break; }
    }
    var rest = headIndex === -1 ? '' : lines.slice(headIndex + 1).join('\n').trim();
    var headLooksLikeSubject = head && head.length <= 90 && !/^(hi|hey|hello|dear)\b/i.test(head);

    if (headLooksLikeSubject && rest) {
      if (!subject) subject = cleanSubject(head);
      body = cleanBody(rest);
    } else {
      body = cleanBody(raw);
    }
  }

  if (!subject) subject = firstLine(body).slice(0, 70) || (startupName + ': worth 15 minutes?');
  subject = cleanSubject(subject);
  if (!subject) subject = startupName + ': worth 15 minutes?';
  if (subject.length > 70) subject = subject.substring(0, 67).trim() + '...';

  if (!body || body.length < 50) return null;

  return { subject: subject, body: body };
}

export async function generatePitch(investorName, firm, startupName, description, ask, research) {
  if (!investorName || !startupName || !description) {
    console.error('generatePitch: investorName, startupName, and description are all required');
    return null;
  }

  var researchBlock = '';
  var citableFacts = [];
  var lowConfidence = false;
  // Proper nouns unique to this investor that the opening may cite: the fund
  // name and named companies. Thesis text is deliberately excluded — it is the
  // portable, could-be-anyone material the portability test rejects.
  var anchors = [];

  if (research) {
    var deals = nonEmptyArray(research.recentDeals);
    var sectors = nonEmptyArray(research.sectorFocus);
    var geos = nonEmptyArray(research.geographyFocus);
    var portfolio = nonEmptyArray(research.portfolioHighlights);
    var keywords = nonEmptyArray(research.thesisKeywords);
    var looksFor = nonEmptyArray(research.whatTheyLookFor);
    var antiPatterns = nonEmptyArray(research.antiPatterns);
    var boards = nonEmptyArray(research.boardSeats);
    var coInvestors = nonEmptyArray(research.coInvestors);
    var stages = nonEmptyArray(research.stagePreference);

    lowConfidence = research.isRealPerson === false || research.confidence === 'low';

    researchBlock = '\n\nVERIFIED RESEARCH ON THIS INVESTOR — cite at least 2 of these specifically:\n';

    // Named deals and portfolio companies lead, because they are what the opening
    // is built from now.
    if (deals.length) { researchBlock += '- Recent deals: ' + deals.join('; ') + '\n'; citableFacts.push('deals'); }
    if (portfolio.length) { researchBlock += '- Portfolio: ' + portfolio.join('; ') + '\n'; citableFacts.push('portfolio'); }
    if (firm) researchBlock += '- Their fund: ' + firm + '\n';
    if (research.thesis) { researchBlock += '- Thesis: ' + research.thesis + '\n'; citableFacts.push('thesis'); }
    if (looksFor.length) { researchBlock += '- Says they look for: ' + looksFor.join('; ') + '\n'; citableFacts.push('criteria'); }
    if (research.recentActivity) { researchBlock += '- Recent activity: ' + research.recentActivity + '\n'; citableFacts.push('activity'); }
    if (keywords.length) researchBlock += '- Words they actually use: ' + keywords.join(', ') + '\n';
    if (boards.length) researchBlock += '- Board seats: ' + boards.join('; ') + '\n';
    if (coInvestors.length) researchBlock += '- Frequent co-investors: ' + coInvestors.join('; ') + '\n';
    if (research.checkSize) researchBlock += '- Typical check: ' + research.checkSize + '\n';
    if (stages.length) researchBlock += '- Stages: ' + stages.join(', ') + '\n';
    if (sectors.length) researchBlock += '- Sectors: ' + sectors.join(', ') + '\n';
    if (geos.length) researchBlock += '- Geography: ' + geos.join(', ') + '\n';

    // Background only. Useful for understanding how they think and which words
    // they use, but the email must never reproduce it in quotation marks.
    if (research.publicQuote) {
      researchBlock += '- Context on how they think (BACKGROUND ONLY, never quote this in the ' +
        'email): ' + research.publicQuote + '\n';
    }

    if (antiPatterns.length) {
      researchBlock += '- AVOID these, they have publicly passed on them: ' + antiPatterns.join('; ') + '\n';
    }

    // Deals/portfolio entries arrive as "Company (year, round)", so the bare name
    // is what a sentence would actually contain.
    if (firm) anchors.push({ type: 'fund', value: firm });
    for (var d = 0; d < deals.length; d++) {
      var dn = bareName(deals[d]);
      if (dn) anchors.push({ type: 'company', value: dn });
    }
    for (var pi = 0; pi < portfolio.length; pi++) {
      var pn = bareName(portfolio[pi]);
      if (pn) anchors.push({ type: 'company', value: pn });
    }
    for (var bi = 0; bi < boards.length; bi++) {
      var bn = bareName(boards[bi]);
      if (bn) anchors.push({ type: 'company', value: bn });
    }

    if (lowConfidence) {
      researchBlock += '- WARNING: identity confidence is LOW. Do not assert any specific fact above as certain. ' +
        'Open on the problem instead, and never invent a deal.\n';
    }
  }

  // Anchors are unusable when identity confidence is low: citing a fact we are
  // not sure belongs to this person is worse than opening on the problem.
  if (lowConfidence) anchors = [];

  var anchorNames = [];
  for (var ai = 0; ai < anchors.length; ai++) anchorNames.push(anchors[ai].value);

  var openingRule;
  if (lowConfidence || !anchors.length) {
    openingRule = '- You have NO verified facts about this investor, so do NOT fake familiarity. ' +
      'Open on a sharp, concrete detail of the problem itself. Never write "I came across your profile", ' +
      'never invent a deal, and never put words in quotation marks as if they said them.\n';
  } else {
    openingRule = '- Line 1 must prove you did the homework on THIS investor. Pick whichever of these ' +
      'the research actually supports:\n' +
      '    (a) A named deal and why it connects to ' + startupName + ' — "Your Series A in Ilara Health ' +
      'shows you understand the gap in African clinical infrastructure."\n' +
      '    (b) The named fund and what it signals — "Closing $154M TIDE Africa Fund II while most funds ' +
      'pulled back says something about your conviction in African tech."\n' +
      '    (c) A named portfolio company and the specific problem it solved, connected to what we are ' +
      'building.\n' +
      '    (d) A provocative true statement about the market that their specific thesis directly answers.\n' +
      '  Whichever you pick, line 1 must contain a proper noun from the research' +
      (anchorNames.length ? ' — ' + anchorNames.slice(0, 4).join(', ') : '') + '.\n' +
      '  Do NOT open with a quotation. Do NOT open with "I noticed" or "I saw". Sound like a founder ' +
      'who did the homework, not a researcher presenting findings.\n';
  }

  var prompt = 'You write cold emails that get replies from investors. Founders forward yours as examples of how it should be done.\n\n' +
    'Write a cold pitch email to ' + investorName + (firm ? ' at ' + firm : '') + '.\n\n' +
    'STARTUP: ' + startupName + '\n' +
    'WHAT WE DO: ' + description + '\n' +
    'THE ASK: ' + (ask || '15-minute call this week') +
    researchBlock + '\n\n' +
    'STRUCTURE (6 short paragraphs max, 150-200 words total):\n' +
    openingRule +
    '- Then: the problem in one vivid, concrete sentence. A specific person hitting a specific wall, not a market-size claim.\n' +
    '- Then: what you built, and exactly why it follows from the opening line. Make the connection explicit.\n' +
    '- Then: one honest proof point. If there is no traction, say what stage it is truthfully — "two hospital pilots signed" or ' +
    '"in build with three design partners". Never imply traction that was not stated above.\n' +
    '- Then: the ask. It must name a specific duration AND a specific day — "15 minutes Thursday", ' +
    '"20 minutes Tuesday morning". Never a vague window like "30 minutes next week", "sometime soon", ' +
    '"in the coming weeks", or "when you have time". Pick a real day.\n' +
    '- Sign off with just a first-person line. No signature block, no placeholder like [Your Name].\n\n' +
    'THE PORTABILITY TEST — this is the bar:\n' +
    'The opening line must contain a proper noun unique to this investor: their fund, a portfolio ' +
    'company, or a company they invested in. A description of their thesis or sector focus FAILS, ' +
    'however well written, because it could be sent to fifty other investors unchanged.\n' +
    'Before finishing, reread line 1. If it contains no name that appears in the research above, ' +
    'rewrite it. And if it opens with a quotation, rewrite it — lead with the insight, not their words.\n\n' +
    'VOICE:\n' +
    '- Short punchy sentences. Vary the rhythm. Some very short.\n' +
    '- Write like a brilliant founder texting a peer, not like a company writing a stranger.\n' +
    '- Concrete nouns and real numbers over adjectives. Show, do not tell.\n' +
    '- Confident, never deferential. You are offering something, not asking permission.\n' +
    '- Sound like a founder who did the homework, not a researcher presenting findings. State what ' +
    'their move means, do not report that you observed it.\n\n' +
    'BANNED — never write any of these:\n' +
    '"I hope this finds you well", "I hope you are doing well", "I am reaching out", "I wanted to reach out", ' +
    '"revolutionary", "disruptive", "game-changing", "cutting-edge", "synergy", "leverage" as a verb, ' +
    '"I would love to", "quick question", "circling back", "touching base", "at your earliest convenience", ' +
    '"I came across your profile", "I noticed", "I saw", "I noticed you invest in", "I have been following", ' +
    '"Dear Sir or Madam", "To whom it may concern", ' +
    'any [bracketed placeholder], any em dash used as a comma substitute.\n' +
    'Also banned, because they say nothing — no vague grandeur and no limp closings:\n' +
    '"I am building something big", "I am building something new", "I am building the future of", ' +
    '"I look forward to it", "I am looking forward to our call", "looking forward to hearing from you", ' +
    '"let me know if you are interested", "any thoughts welcome", "hope to hear from you soon".\n\n' +
    'Do not fabricate. Every fact about the investor must come from the research above; ' +
    'every fact about the startup must come from WHAT WE DO or THE ASK. ' +
    'Do not put words in this investor\'s mouth: never write a sentence in quotation marks and ' +
    'attribute it to them.\n\n' +
    'OUTPUT — this exact format, nothing before or after:\n' +
    '---SUBJECT---\n' +
    '6-9 words, lowercase-ish, specific to this investor, no colon-heavy clickbait\n' +
    '---BODY---\n' +
    'the email, starting with "Hi ' + String(investorName).split(' ')[0] + ',"';

  // A 150-200 word email is ~350 completion tokens. Groq's llama models are not
  // reasoning models, so unlike Gemini there are no thinking tokens sharing this
  // budget — the earlier 3072/6144 figures existed only to leave room for those.
  // 1024 is ample here, with one escalation in case the model rambles.
  var TOKEN_BUDGETS = [1024, 2048];

  // Instructions alone do not guarantee compliance, so the two rules that matter
  // most are checked against the output and re-prompted once with the specific
  // failure named. A misquote attributes invented words to a real person, and a
  // thesis-restatement opening is the exact failure the portability test exists
  // to catch — neither is worth shipping just because the model was told not to.
  var MAX_QUALITY_RETRIES = 1;

  var parsed = null;
  var result = null;
  var qualityRetries = 0;
  var activePrompt = prompt;
  // Hard cap on total calls. The quality gate rewinds the token-budget index, so
  // without this a pathological model could loop; MAX_QUALITY_RETRIES bounds the
  // rewinds and this bounds everything.
  var callsMade = 0;
  var MAX_CALLS = TOKEN_BUDGETS.length + MAX_QUALITY_RETRIES;

  for (var attempt = 0; attempt < TOKEN_BUDGETS.length && callsMade < MAX_CALLS; attempt++) {
    var budget = TOKEN_BUDGETS[attempt < 0 ? 0 : attempt];
    callsMade++;
    try {
      result = await callGroq({
        prompt: activePrompt,
        temperature: 0.85,
        maxTokens: budget,
        timeoutMs: 18000,
        // Shares the 60s function budget with researchInvestor (13s) and the 2s
        // inter-call delay: 13 + 2 + 20 + 14 = 49s worst case.
        deadlineMs: attempt <= 0 ? 20000 : 14000,
        label: 'generatePitch'
      });
    } catch (err) {
      console.error('generatePitch: unexpected error calling Groq for ' + investorName + ': ' +
        (err && err.message ? err.message : String(err)));
      return null;
    }

    if (result.ok) {
      // Quality gate. Runs inside the loop so a correction reuses the remaining
      // attempt budget rather than needing its own.
      var candidate = null;
      try {
        candidate = parseSubjectAndBody(result.text, startupName);
      } catch (err) {
        console.error('generatePitch: parsing threw for ' + investorName + ': ' +
          (err && err.message ? err.message : String(err)));
        return null;
      }

      if (candidate && qualityRetries < MAX_QUALITY_RETRIES) {
        var complaint = '';

        // Openings must not quote the investor at all. Anything quoted there is
        // either an invented attribution or the old quote-led style resurfacing.
        if (openingHasQuotedSpan(candidate.body)) {
          complaint += 'Your opening line leads with a quotation. Do not open with a quote. Rewrite ' +
            'line 1 so it states what their move means — a named deal and why it connects to ' +
            startupName + ', the named fund and what it signals, or a true statement about the ' +
            'market their thesis answers.\n';
        }

        // "I noticed" / "I saw" reads as a researcher reporting findings rather
        // than a founder who already understands the space.
        if (/\b(i\s+noticed|i\s+saw|i\s+came\s+across|i\s+have\s+been\s+following)\b/i.test(openingText(candidate.body))) {
          complaint += 'Your opening line uses "I noticed" or "I saw", which sounds like a researcher ' +
            'presenting findings. Cut the observation verb and state the point directly.\n';
        }

        if (!openingUsesAnchor(candidate.body, anchors)) {
          complaint += 'Your opening line fails the portability test: it contains no proper noun ' +
            'unique to this investor, so it could be sent to any other investor unchanged. Rewrite ' +
            'line 1 so it names one of these' +
            (anchorNames.length ? ': ' + anchorNames.slice(0, 4).join(', ') : ' from the research') +
            ', and says what it means rather than that you saw it.\n';
        }

        if (complaint) {
          qualityRetries++;
          console.warn('generatePitch: quality gate rejected draft for ' + investorName +
            ' — ' + complaint.trim().replace(/\n/g, ' | ') + ' Retrying once.');
          activePrompt = prompt + '\n\nYOUR PREVIOUS DRAFT WAS REJECTED. Fix exactly this:\n' +
            complaint + 'Keep everything else that worked. Output the same ---SUBJECT--- / ' +
            '---BODY--- format.';
          attempt--; // spend a quality retry, not a token-budget escalation
          continue;
        }
      }

      parsed = candidate;
      break;
    }

    // Only truncation is worth retrying, and only with a bigger budget. Any other
    // failure will not improve on a second identical call.
    if (result.truncated && attempt < TOKEN_BUDGETS.length - 1) {
      console.warn('generatePitch: output truncated for ' + investorName + ' at ' +
        budget + ' tokens; retrying at ' + TOKEN_BUDGETS[attempt + 1] + '.');
      continue;
    }
    break;
  }

  if (!result || !result.ok) {
    if (result && result.rateLimited) {
      console.error('generatePitch: RATE LIMITED generating for ' + investorName +
        ' — Groq quota exhausted after ' + (result.retryAttempts || 0) +
        ' retries. This investor was skipped, not silently replaced.');
      var rateErr = new Error('Groq rate limit exceeded. Wait a minute and retry this investor.');
      rateErr.rateLimited = true;
      throw rateErr;
    }
    console.error('generatePitch: Groq call failed for ' + investorName + ' — ' +
      (result ? result.error : 'no result'));
    return null;
  }

  if (!parsed) {
    console.error('generatePitch: could not extract a usable subject/body for ' + investorName +
      '. Raw output (first 400 chars): ' + String(result.text).substring(0, 400));
    return null;
  }

  // Surfaces leaked placeholders rather than emailing "[Your Name]" to an investor.
  if (/\[[^\]]{2,40}\]/.test(parsed.body)) {
    console.warn('generatePitch: body contains a bracketed placeholder for ' + investorName +
      ' — stripping it.');
    parsed.body = parsed.body.replace(/\[[^\]]{2,40}\]/g, '').replace(/[ \t]{2,}/g, ' ').trim();
    if (parsed.body.length < 50) {
      console.error('generatePitch: body too short after placeholder cleanup for ' + investorName);
      return null;
    }
  }

  // Content-level truncation check. finishReason can read STOP while the text
  // still ends mid-sentence, so this rejects a body that does not end on
  // terminal punctuation — better no pitch than a half-finished one in an
  // investor's inbox.
  if (!looksComplete(parsed.body)) {
    console.error('generatePitch: body appears to end mid-sentence for ' + investorName +
      ' (finishReason: ' + (result.finishReason || 'unknown') + ', last 60 chars: "' +
      parsed.body.slice(-60).replace(/\n/g, ' ') + '"). Rejecting.');
    return null;
  }

  // Final compliance state, logged so the gate's effect is observable in Vercel
  // rather than inferred. anchored=no after a retry means the model would not
  // comply and the pitch shipped generic — worth knowing.
  var anchored = openingUsesAnchor(parsed.body, anchors);
  if (!anchored && anchors.length) {
    console.warn('generatePitch: opening for ' + investorName +
      ' still lacks a verified anchor after ' + qualityRetries + ' correction attempt(s). ' +
      'Shipping anyway, but this pitch is portable. Opening: "' +
      openingText(parsed.body).slice(0, 120) + '"');
  }

  console.log('generatePitch: done for ' + investorName +
    ' | research: ' + (research ? 'yes (' + citableFacts.length + ' fact groups)' : 'no') +
    ' | anchors available: ' + anchors.length +
    ' | anchored opening: ' + (anchored ? 'yes' : 'NO') +
    ' | quality retries: ' + qualityRetries +
    ' | words: ' + parsed.body.split(/\s+/).length +
    ' | model: ' + result.model);

  return { subject: parsed.subject, body: parsed.body };
}

export default generatePitch;
