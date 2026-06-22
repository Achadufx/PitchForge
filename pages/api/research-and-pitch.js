import { researchInvestor } from '../../lib/researchInvestor';
import { generatePitch } from '../../lib/generatePitch';

function scoreInvestor(research, startupProfile) {
  var score = 0;
  var matchReasons = [];

  if (!research || !startupProfile) return { score: 0, matchReasons: [] };

  var sf = startupProfile;

  // Sector (35pts)
  if (sf.sector && research.sectorFocus) {
    var sectorHit = research.sectorFocus.some(function(s) {
      return s.toLowerCase().includes(sf.sector.toLowerCase()) ||
        sf.sector.toLowerCase().includes(s.toLowerCase());
    });
    if (sectorHit) { score += 35; matchReasons.push('Invests in ' + sf.sector); }
  }
  if (research.scoreFactors && research.scoreFactors.investsInHealth) {
    score += 10; matchReasons.push('Health-focused');
  }

  // Stage (25pts)
  if (sf.stage && research.stagePreference) {
    var stageHit = research.stagePreference.some(function(s) {
      return s.toLowerCase().includes(sf.stage.toLowerCase()) ||
        sf.stage.toLowerCase().includes(s.toLowerCase());
    });
    if (stageHit) { score += 25; matchReasons.push('Invests at ' + sf.stage); }
  }

  // Geography (20pts)
  if (sf.geography && research.geographyFocus) {
    var geoHit = research.geographyFocus.some(function(g) {
      return (sf.geography || []).some(function(sg) {
        return g.toLowerCase().includes(sg.toLowerCase()) ||
          sg.toLowerCase().includes(g.toLowerCase());
      });
    });
    if (geoHit) { score += 20; matchReasons.push('Active in your region'); }
  }
  if (research.scoreFactors && research.scoreFactors.investsInAfrica) {
    score += 10; matchReasons.push('Africa-focused');
  }

  // Recency (10pts)
  if (research.scoreFactors && research.scoreFactors.activeLast12Months) {
    score += 10; matchReasons.push('Recently active');
  }

  return { score: Math.min(score, 100), matchReasons: matchReasons };
}

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

  // Step 1: Research — one call, shared by scoring and pitch
  console.log('Step 1: Researching', investorName);
  var research = await researchInvestor(investorName, firm);

  // Step 2: Score using fresh research
  var scoring = scoreInvestor(research, startupProfile);

  // Step 3: Generate pitch using same research object — no second API call
  console.log('Step 2: Generating pitch for', investorName);
  var pitch = await generatePitch(investorName, firm, startupName, description, ask, research);

  return res.status(200).json({
    success: !!pitch,
    investorName: investorName,
    firm: firm || null,
    research: research,
    score: scoring.score,
    matchReasons: scoring.matchReasons,
    pitch: pitch,
    error: pitch ? null : 'Pitch generation failed'
  });
}
