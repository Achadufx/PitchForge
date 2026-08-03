import { callGemini } from '../../lib/geminiClient';
import { extractJson } from '../../lib/extractJson';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var documents = req.body && req.body.documents;
  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: 'No documents provided' });
  }

  try {
    var combinedText = documents
      .map(function (doc) {
        return '=== ' + ((doc && doc.name) || 'document') + ' ===\n' + ((doc && doc.text) || '');
      })
      .join('\n\n');

    if (!combinedText.trim()) {
      return res.status(400).json({ error: 'Documents contained no readable text' });
    }

    var prompt = 'You are an expert startup analyst. Analyze the following startup documents and extract key information.\n\n' +
      'Documents:\n' + combinedText.slice(0, 40000) + '\n\n' +
      'Return ONLY a valid JSON object with these keys: companyName, tagline, industry, subIndustry, ' +
      'businessModel, problem, solution, competitiveAdvantage, stage, amountRaising, useOfFunds, country, ' +
      'region, expansionPlans, revenue, users, growthRate, traction, teamSummary, pitchSummary.\n' +
      'Use null for anything the documents do not state. Never invent numbers or traction.';

    var result = await callGemini({
      prompt: prompt,
      temperature: 0.1,
      maxOutputTokens: 2048,
      jsonMode: true,
      label: 'extract-text'
    });

    if (!result.ok) {
      console.error('extract-text: ' + result.error);
      return res.status(502).json({ error: 'Analysis failed: ' + result.error });
    }

    var parsed = extractJson(result.text);
    if (!parsed) {
      return res.status(502).json({
        error: 'Could not parse the AI response. Please try again.',
        raw: String(result.text).substring(0, 500)
      });
    }

    return res.json({ profile: parsed, success: true, model: result.model });

  } catch (err) {
    console.error('extract-text error: ' + (err && err.message ? err.message : String(err)));
    return res.status(500).json({ error: 'Analysis failed: ' + (err && err.message ? err.message : String(err)) });
  }
}
