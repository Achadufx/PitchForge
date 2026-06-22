export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { investorName, firm } = req.body;

  if (!investorName) {
    return res.status(400).json({ error: 'investorName is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const researchPrompt = 'Research the investor ' + investorName + (firm ? ' at ' + firm : '') + '.\n\n' +
    'Find and return the following in valid JSON only (no markdown, no explanation):\n\n' +
    '{\n' +
    '  "thesis": "their stated investment thesis in 1-2 sentences, in their own words if possible",\n' +
    '  "recentDeals": ["company1 (year)", "company2 (year)", "company3 (year)"],\n' +
    '  "checkSize": "typical check size range e.g. $250K-$500K",\n' +
    '  "stagePreference": ["pre-seed", "seed"],\n' +
    '  "geographyFocus": ["US", "Africa", "Global"],\n' +
    '  "sectorFocus": ["healthtech", "fintech"],\n' +
    '  "portfolioHighlights": ["notable company they invested in", "another one"],\n' +
    '  "publicQuote": "a real quote from them about investing or a specific sector, or empty string if none found",\n' +
    '  "matchSignals": ["keyword1", "keyword2", "keyword3"],\n' +
    '  "scoreFactors": {\n' +
    '    "investsInHealth": true,\n' +
    '    "investsInAfrica": false,\n' +
    '    "investsInDataPrivacy": false,\n' +
    '    "activeLast12Months": true\n' +
    '  }\n' +
    '}\n\n' +
    'Use web search to find real, current information. If a field is unknown after searching, use null. Never fabricate data.';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: researchPrompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Claude API error:', data.error);
      return res.status(500).json({ error: 'Research failed', details: data.error.message });
    }

    // Extract the text block from response (may contain tool_use and text blocks)
    const textBlock = (data.content || []).find(function(block) {
      return block.type === 'text';
    });

    if (!textBlock || !textBlock.text) {
      return res.status(500).json({ error: 'No research output returned' });
    }

    // Parse JSON — strip any accidental markdown fences
    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    let research;
    try {
      research = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse failed:', cleaned.substring(0, 200));
      return res.status(500).json({ error: 'Research output was not valid JSON', raw: cleaned.substring(0, 500) });
    }

    // Attach metadata
    research.investorName = investorName;
    research.firm = firm || null;
    research.researchedAt = new Date().toISOString();

    console.log('Research complete for:', investorName);
    return res.status(200).json({ success: true, research });

  } catch (err) {
    console.error('research-investor error:', err);
    return res.status(500).json({ error: 'Research request failed', details: err.message });
  }
}
