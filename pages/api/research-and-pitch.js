// pages/api/research-and-pitch.js
// Single endpoint: call this instead of calling research-investor + generate-pitch separately.
// It runs research ONCE, uses it for scoring AND pitch generation, returns everything.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { investorName, firm, startupName, description, ask, startupProfile } = req.body;

  if (!investorName || !startupName || !description) {
    return res.status(400).json({ error: 'investorName, startupName, and description are required' });
  }

  var baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pitchwire.vercel.app';

  // ── STEP 1: Research the investor ──────────────────────────────────────────
  var research = null;
  try {
    console.log('Step 1: Researching', investorName);
    var researchRes = await fetch(baseUrl + '/api/research-investor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investorName: investorName, firm: firm })
    });
    var researchData = await researchRes.json();
    if (researchData.success && researchData.research) {
      research = researchData.research;
      console.log('Research complete:', investorName);
    } else {
      console.warn('Research failed, proceeding without it:', researchData.error);
    }
  } catch (err) {
    console.warn('Research step threw:', err.message);
  }

  // ── STEP 2: Score the investor using fresh research ─────────────────────────
  var score = 0;
  var matchReasons = [];

  if (research && startupProfile) {
    var sf = startupProfile;

    // Sector match — check research sectorFocus and scoreFactors
    if (sf.sector && research.sectorFocus) {
      var sectorHit = research.sectorFocus.some(function(s) {
        return s.toLowerCase().includes(sf.sector.toLowerCase()) ||
          sf.sector.toLowerCase().includes(s.toLowerCase());
      });
      if (sectorHit) { score += 35; matchReasons.push('Invests in ' + sf.sector); }
    }
    if (research.scoreFactors && research.scoreFactors.investsInHealth) {
      score += 10; matchReasons.push('Health-focused investor');
    }

    // Stage match
    if (sf.stage && research.stagePreference) {
      var stageHit = research.stagePreference.some(function(s) {
        return s.toLowerCase().includes(sf.stage.toLowerCase()) ||
          sf.stage.toLowerCase().includes(s.toLowerCase());
      });
      if (stageHit) { score += 25; matchReasons.push('Invests at ' + sf.stage); }
    }

    // Geography match
    if (sf.geography && research.geographyFocus) {
      var geoHit = research.geographyFocus.some(function(g) {
        return sf.geography.some(function(sg) {
          return g.toLowerCase().includes(sg.toLowerCase()) ||
            sg.toLowerCase().includes(g.toLowerCase());
        });
      });
      if (geoHit) { score += 20; matchReasons.push('Active in your region'); }
    }
    if (research.scoreFactors && research.scoreFactors.investsInAfrica) {
      score += 10; matchReasons.push('Africa-focused investor');
    }

    // Recency bonus
    if (research.scoreFactors && research.scoreFactors.activeLast12Months) {
      score += 10; matchReasons.push('Recently active');
    }
  }

  score = Math.min(score, 100);

  // ── STEP 3: Generate the pitch using the same research ──────────────────────
  var subject = null;
  var body = null;
  var pitchError = null;

  try {
    console.log('Step 3: Generating pitch for', investorName);
    var pitchRes = await fetch(baseUrl + '/api/generate-pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        investorName: investorName,
        firm: firm,
        startupName: startupName,
        description: description,
        ask: ask,
        investorResearch: research  // same research object, not fetched again
      })
    });
    var pitchData = await pitchRes.json();
    if (pitchData.subject && pitchData.body) {
      subject = pitchData.subject;
      body = pitchData.body;
    } else {
      pitchError = pitchData.error || 'Pitch generation returned no content';
      console.error('Pitch failed:', pitchError);
    }
  } catch (err) {
    pitchError = err.message;
    console.error('Pitch step threw:', err.message);
  }

  // ── RETURN everything ───────────────────────────────────────────────────────
  return res.status(200).json({
    success: !pitchError,
    investorName: investorName,
    firm: firm || null,
    research: research,
    score: score,
    matchReasons: matchReasons,
    pitch: pitchError ? null : { subject: subject, body: body },
    pitchError: pitchError || null
  });
}
