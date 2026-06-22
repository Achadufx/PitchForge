export async function researchInvestor(investorName, firm) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not set, skipping research');
    return null;
  }

  var prompt = 'Research the investor ' + investorName + (firm ? ' at ' + firm : '') + '.\n\n' +
    'Return ONLY valid JSON, no markdown, no explanation:\n\n' +
    '{\n' +
    '  "thesis": "their investment thesis in 1-2 sentences",\n' +
    '  "recentDeals": ["company (year)", "company (year)"],\n' +
    '  "checkSize": "e.g. $250K-$1M",\n' +
    '  "stagePreference": ["pre-seed", "seed"],\n' +
    '  "geographyFocus": ["US", "Africa"],\n' +
    '  "sectorFocus": ["healthtech", "fintech"],\n' +
    '  "portfolioHighlights": ["notable company", "another"],\n' +
    '  "publicQuote": "a real quote they said publicly, or empty string",\n' +
    '  "scoreFactors": {\n' +
    '    "investsInHealth": true,\n' +
    '    "investsInAfrica": false,\n' +
    '    "activeLast12Months": true\n' +
    '  }\n' +
    '}\n\n' +
    'Use web search to find real current information. Use null for anything not found. Never fabricate.';

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages: [{ role: 'user', content: prompt }]
      })
    });

    var data = await response.json();

    if (data.error) {
      console.error('Claude research error:', data.error.message);
      return null;
    }

    var textBlock = (data.content || []).find(function(b) { return b.type === 'text'; });
    if (!textBlock || !textBlock.text) return null;

    var cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    var research = JSON.parse(cleaned);
    research.investorName = investorName;
    research.firm = firm || null;
    research.researchedAt = new Date().toISOString();

    console.log('Research done:', investorName);
    return research;

  } catch (err) {
    console.error('researchInvestor failed:', err.message);
    return null;
  }
}
