import { callGemini } from './geminiClient';

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
    if (research.thesis) { researchBlock += '- Thesis: ' + research.thesis + '\n'; citableFacts.push('thesis'); }
    if (deals.length) { researchBlock += '- Recent deals: ' + deals.join('; ') + '\n'; citableFacts.push('deals'); }
    if (portfolio.length) { researchBlock += '- Portfolio: ' + portfolio.join('; ') + '\n'; citableFacts.push('portfolio'); }
    if (research.publicQuote) {
      researchBlock += '- Verbatim quote' + (research.quoteSource ? ' (' + research.quoteSource + ')' : '') +
        ': "' + research.publicQuote + '"\n';
      citableFacts.push('quote');
    }
    if (looksFor.length) { researchBlock += '- Says they look for: ' + looksFor.join('; ') + '\n'; citableFacts.push('criteria'); }
    if (research.recentActivity) { researchBlock += '- Recent activity: ' + research.recentActivity + '\n'; citableFacts.push('activity'); }
    if (keywords.length) researchBlock += '- Words they actually use: ' + keywords.join(', ') + '\n';
    if (boards.length) researchBlock += '- Board seats: ' + boards.join('; ') + '\n';
    if (coInvestors.length) researchBlock += '- Frequent co-investors: ' + coInvestors.join('; ') + '\n';
    if (research.checkSize) researchBlock += '- Typical check: ' + research.checkSize + '\n';
    if (stages.length) researchBlock += '- Stages: ' + stages.join(', ') + '\n';
    if (sectors.length) researchBlock += '- Sectors: ' + sectors.join(', ') + '\n';
    if (geos.length) researchBlock += '- Geography: ' + geos.join(', ') + '\n';
    if (antiPatterns.length) {
      researchBlock += '- AVOID these, they have publicly passed on them: ' + antiPatterns.join('; ') + '\n';
    }
    if (lowConfidence) {
      researchBlock += '- WARNING: identity confidence is LOW. Do not assert any specific fact above as certain. ' +
        'Open on the problem instead, and never invent a deal or quote.\n';
    }
  }

  var openingRule = citableFacts.length > 0 && !lowConfidence
    ? '- Line 1 must name ONE specific verified fact above (a named deal, their verbatim quote, or their exact thesis wording). ' +
      'Name the company or quote the phrase. Generic sector talk fails.\n'
    : '- You have NO verified facts about this investor, so do NOT fake familiarity. ' +
      'Open on a sharp, concrete detail of the problem itself. Never write "I came across your profile" or invent a deal.\n';

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
    '- Then: the ask, specific and confident. Name the amount of time and what happens on the call.\n' +
    '- Sign off with just a first-person line. No signature block, no placeholder like [Your Name].\n\n' +
    'THE PORTABILITY TEST — this is the bar:\n' +
    'If the opening line could be pasted into an email to any other investor without editing, it has failed. ' +
    'Before finishing, reread line 1 and ask: could this be sent to a different investor unchanged? If yes, rewrite it.\n\n' +
    'VOICE:\n' +
    '- Short punchy sentences. Vary the rhythm. Some very short.\n' +
    '- Write like a brilliant founder texting a peer, not like a company writing a stranger.\n' +
    '- Concrete nouns and real numbers over adjectives. Show, do not tell.\n' +
    '- Confident, never deferential. You are offering something, not asking permission.\n\n' +
    'BANNED — never write any of these:\n' +
    '"I hope this finds you well", "I hope you are doing well", "I am reaching out", "I wanted to reach out", ' +
    '"revolutionary", "disruptive", "game-changing", "cutting-edge", "synergy", "leverage" as a verb, ' +
    '"I would love to", "quick question", "circling back", "touching base", "at your earliest convenience", ' +
    '"I came across your profile", "I noticed you invest in", "Dear Sir or Madam", "To whom it may concern", ' +
    'any [bracketed placeholder], any em dash used as a comma substitute.\n\n' +
    'Do not fabricate. Every fact about the investor must come from the research above; ' +
    'every fact about the startup must come from WHAT WE DO or THE ASK.\n\n' +
    'OUTPUT — this exact format, nothing before or after:\n' +
    '---SUBJECT---\n' +
    '6-9 words, lowercase-ish, specific to this investor, no colon-heavy clickbait\n' +
    '---BODY---\n' +
    'the email, starting with "Hi ' + String(investorName).split(' ')[0] + ',"';

  var result;
  try {
    result = await callGemini({
      prompt: prompt,
      temperature: 0.85,
      maxOutputTokens: 1400,
      label: 'generatePitch'
    });
  } catch (err) {
    console.error('generatePitch: unexpected error calling Gemini for ' + investorName + ': ' +
      (err && err.message ? err.message : String(err)));
    return null;
  }

  if (!result.ok) {
    console.error('generatePitch: Gemini call failed for ' + investorName + ' — ' + result.error);
    return null;
  }

  var parsed;
  try {
    parsed = parseSubjectAndBody(result.text, startupName);
  } catch (err) {
    console.error('generatePitch: parsing threw for ' + investorName + ': ' +
      (err && err.message ? err.message : String(err)));
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

  console.log('generatePitch: done for ' + investorName +
    ' | research: ' + (research ? 'yes (' + citableFacts.length + ' fact groups)' : 'no') +
    ' | words: ' + parsed.body.split(/\s+/).length +
    ' | model: ' + result.model);

  return { subject: parsed.subject, body: parsed.body };
}

export default generatePitch;
