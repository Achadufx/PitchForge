import { researchInvestor } from '../../lib/researchInvestor';
import { generatePitch } from '../../lib/generatePitch';
import { geminiConfigError } from '../../lib/geminiClient';

// Spacing between the two Gemini calls in a single investor request. Free-tier
// quota is per-minute, so firing research and pitch back to back counts as two
// requests in the same window and pushes the campaign over the limit faster.
//
// This sleep is dead time inside a 60s Vercel function, so raising it directly
// squeezes the budget available to the two API calls. The per-call deadlines in
// lib/researchInvestor.js and lib/generatePitch.js were reduced to compensate:
//   research 13s + delay 12s + pitch 14s + truncation retry 12s = 51s
var INTER_CALL_DELAY_MS = 12000;

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

  // Fail loudly and early on misconfiguration rather than after two dead API calls.
  var configError = geminiConfigError();
  if (configError) {
    console.error('research-and-pitch: ' + configError);
    return res.status(500).json({ success: false, error: configError, stage: 'config' });
  }

  var research = null;
  var researchError = null;

  try {
    console.log('research-and-pitch step 1: researching ' + investorName);
    research = await researchInvestor(investorName, firm);
    if (!research) {
      researchError = 'Investor research returned no usable data. Check server logs for the Gemini error.';
      console.warn('research-and-pitch: ' + researchError);
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

  // Space the two Gemini calls apart. Skipped when research failed outright,
  // since there was no successful request to space away from and the remaining
  // function budget is better spent on the pitch itself.
  if (research) {
    console.log('research-and-pitch: waiting ' + INTER_CALL_DELAY_MS +
      'ms before the pitch call to stay under the per-minute quota');
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
      ? (err.message || 'Gemini rate limit exceeded')
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
