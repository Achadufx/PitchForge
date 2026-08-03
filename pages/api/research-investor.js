import { researchInvestor } from '../../lib/researchInvestor';
import { groqConfigError } from '../../lib/groqClient';

// Thin wrapper over lib/researchInvestor, which runs on Groq.
//
// This endpoint previously called the Anthropic API directly with model
// 'claude-sonnet-4-6' and ANTHROPIC_API_KEY — a second provider, a second key,
// and a duplicated prompt. Nothing in the frontend calls this route; it now
// shares one implementation with /api/research-and-pitch so the two cannot
// diverge.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body || {};
  var investorName = body.investorName;
  var firm = body.firm;

  if (!investorName) {
    return res.status(400).json({ error: 'investorName is required' });
  }

  var configError = groqConfigError();
  if (configError) {
    console.error('research-investor: ' + configError);
    return res.status(500).json({ error: configError });
  }

  try {
    var research = await researchInvestor(investorName, firm);

    if (!research) {
      return res.status(502).json({
        error: 'Research failed. Check server logs for the [researchInvestor] error line.'
      });
    }

    return res.status(200).json({ success: true, research: research });

  } catch (err) {
    console.error('research-investor error: ' + (err && err.message ? err.message : String(err)));
    return res.status(500).json({
      error: 'Research request failed',
      details: err && err.message ? err.message : String(err)
    });
  }
}
