import { researchInvestor } from '../../lib/researchInvestor';
import { generatePitch } from '../../lib/generatePitch';
import { geminiConfigError } from '../../lib/geminiClient';
import { groqConfigError } from '../../lib/groqClient';

// Spacing between the research call and the pitch call. Since the provider split
// these hit DIFFERENT providers — research on Gemini, pitch on Groq — so they no
// longer share a quota window and the long 12s spacer is unnecessary. A small
// gap is kept because consecutive investors still queue against Gemini's
// per-minute research quota.
//
// This sleep is dead time inside a 60s Vercel function:
//   research 13s + delay 2s + pitch 20s + truncation retry 14s = 49s
var INTER_CALL_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// Every field here can be null — Gemini is told to use null for unknowns — so
// each accessor guards before calling array methods. The previous version called
// research.sectorFocus.some(...) directly and threw TypeError on null, killing
// the request after research had already succeeded.
function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function looseMatch(a, b) {
  if (!a || !b) return false;
  var x = String(a).toLowerCase().trim();
  var y = String(b).toLowerCase().trim();
  if (!x || !y) return false;
  return x.indexOf(y) !== -1 || y.indexOf(x) !== -1;
}

function scoreInvestor(research, startupProfile) {
  var score = 0;
  var matchReasons = [];

  if (!research || !startupProfile) return { score: 0, matchReasons: [] };

  try {
    var sf = startupProfile;

    var sectorFocus = asArray(research.sectorFocus);
    if (sf.sector && sectorFocus.length) {
      var sectorHit = sectorFocus.some(function (s) { return looseMatch(s, sf.sector); });
      if (sectorHit) { score += 35; matchReasons.push('Invests in ' + sf.sector); }
    }

    var factors = research.scoreFactors && typeof research.scoreFactors === 'object'
      ? research.scoreFactors : {};

    if (factors.investsInHealth === true) { score += 10; matchReasons.push('Health-focused'); }

    var stagePreference = asArray(research.stagePreference);
    if (sf.stage && stagePreference.length) {
      var stageHit = stagePreference.some(function (s) { return looseMatch(s, sf.stage); });
      if (stageHit) { score += 25; matchReasons.push('Invests at ' + sf.stage); }
    }

    var geographyFocus = asArray(research.geographyFocus);
    var startupGeos = asArray(sf.geography);
    if (startupGeos.length && geographyFocus.length) {
      var geoHit = geographyFocus.some(function (g) {
        return startupGeos.some(function (sg) { return looseMatch(g, sg); });
      });
      if (geoHit) { score += 20; matchReasons.push('Active in your region'); }
    }

    if (factors.investsInAfrica === true) { score += 10; matchReasons.push('Africa-focused'); }
    if (factors.activeLast12Months === true) { score += 10; matchReasons.push('Recently active'); }

    return { score: Math.min(score, 100), matchReasons: matchReasons };

  } catch (err) {
    console.error('scoreInvestor failed (non-fatal, scoring 0): ' +
      (err && err.message ? err.message : String(err)));
    return { score: 0, matchReasons: [] };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body || {};
  var investorName = body.investorName;
  var firm = body.firm;
  var startupName = body.startupName;
  var description = body.description;
  var ask = body.ask;
  var startupProfile = body.startupProfile;

  if (!investorName || !startupName || !description) {
    return res.status(400).json({
      success: false,
      error: 'investorName, startupName, and description are required'
    });
  }

  // Fail loudly and early on misconfiguration rather than after dead API calls.
  //
  // GROQ_API_KEY is the hard requirement: it generates the pitch, which is the
  // actual deliverable. GEMINI_API_KEY is only needed for research, and a pitch
  // still generates without it (the prompt then avoids inventing specifics), so
  // a missing Gemini key degrades rather than fails.
  var groqError = groqConfigError();
  if (groqError) {
    console.error('research-and-pitch: ' + groqError);
    return res.status(500).json({ success: false, error: groqError, stage: 'config' });
  }

  var geminiError = geminiConfigError();
  if (geminiError) {
    console.warn('research-and-pitch: ' + geminiError +
      ' Continuing without investor research — pitches will be less specific.');
  }

  var research = null;
  var researchError = geminiError
    ? 'Investor research skipped: GEMINI_API_KEY is not configured.'
    : null;

  try {
    if (geminiError) {
      console.log('research-and-pitch step 1: SKIPPED (no Gemini key) for ' + investorName);
    } else {
      console.log('research-and-pitch step 1: researching ' + investorName);
      research = await researchInvestor(investorName, firm);
      if (!research) {
        researchError = 'Investor research returned no usable data. Check server logs for the Gemini error.';
        console.warn('research-and-pitch: ' + researchError);
      }
    }
  } catch (err) {
    researchError = 'Research threw: ' + (err && err.message ? err.message : String(err));
    console.error('research-and-pitch: ' + researchError);
  }

  var scoring = { score: 0, matchReasons: [] };
  try {
    scoring = scoreInvestor(research, startupProfile);
  } catch (err) {
    console.error('research-and-pitch: scoring failed: ' + (err && err.message ? err.message : String(err)));
  }

  var pitch = null;
  var pitchError = null;
  var rateLimited = false;

  // Small gap between the Gemini research call and the Groq pitch call. Skipped
  // when research did not run or failed outright: there was no successful request
  // to space away from, and the remaining function budget is better spent on the
  // pitch itself.
  if (research) {
    console.log('research-and-pitch: waiting ' + INTER_CALL_DELAY_MS +
      'ms before the Groq pitch call');
    await sleep(INTER_CALL_DELAY_MS);
  }

  try {
    console.log('research-and-pitch step 2: generating pitch for ' + investorName);
    pitch = await generatePitch(investorName, firm, startupName, description, ask, research);
    if (!pitch) {
      pitchError = 'Pitch generation returned no usable output. Check server logs for the Gemini error.';
      console.error('research-and-pitch: ' + pitchError);
    }
  } catch (err) {
    rateLimited = !!(err && err.rateLimited);
    pitchError = rateLimited
      ? (err.message || 'AI provider rate limit exceeded')
      : 'Pitch generation threw: ' + (err && err.message ? err.message : String(err));
    console.error('research-and-pitch: ' + pitchError);
  }

  // 429 tells the client to back off and retry this investor rather than
  // treating it as a permanent failure.
  if (!pitch && rateLimited) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      success: false,
      investorName: investorName,
      firm: firm || null,
      research: research,
      score: scoring.score,
      matchReasons: scoring.matchReasons,
      pitch: null,
      stage: 'pitch',
      rateLimited: true,
      error: pitchError,
      researchError: researchError
    });
  }

  // A failed pitch is a real failure and must not return HTTP 200 with a null
  // pitch — the client previously treated that as "fine" and substituted a
  // hardcoded generic email.
  if (!pitch) {
    return res.status(502).json({
      success: false,
      investorName: investorName,
      firm: firm || null,
      research: research,
      score: scoring.score,
      matchReasons: scoring.matchReasons,
      pitch: null,
      stage: 'pitch',
      error: pitchError || 'Pitch generation failed',
      researchError: researchError
    });
  }

  return res.status(200).json({
    success: true,
    investorName: investorName,
    firm: firm || null,
    research: research,
    score: scoring.score,
    matchReasons: scoring.matchReasons,
    pitch: pitch,
    researchError: researchError,
    error: null
  });
}
