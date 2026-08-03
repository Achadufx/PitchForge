import { generatePitch } from '../../lib/generatePitch';
import { geminiConfigError } from '../../lib/geminiClient';

// Thin wrapper over lib/generatePitch so this endpoint and /api/research-and-pitch
// can never drift apart. It previously carried its own duplicated copy of the
// prompt, its own model name, and a `thinkingBudget` option that was both
// misplaced (it belongs under thinkingConfig) and unsupported outside 2.5.
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
  var investorResearch = body.investorResearch;

  if (!investorName || !startupName || !description) {
    return res.status(400).json({ error: 'investorName, startupName, and description are required' });
  }

  var configError = geminiConfigError();
  if (configError) {
    console.error('generate-pitch: ' + configError);
    return res.status(500).json({ error: configError });
  }

  try {
    var pitch = await generatePitch(investorName, firm, startupName, description, ask, investorResearch);

    if (!pitch) {
      return res.status(502).json({
        error: 'Pitch generation failed. Check server logs for the [generatePitch] error line.'
      });
    }

    return res.status(200).json({ subject: pitch.subject, body: pitch.body });

  } catch (err) {
    console.error('generate-pitch error: ' + (err && err.message ? err.message : String(err)));
    return res.status(500).json({
      error: 'Pitch generation failed',
      details: err && err.message ? err.message : String(err)
    });
  }
}
