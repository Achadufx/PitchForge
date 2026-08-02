export async function researchInvestor(investorName, firm) {
  if (!process.env.AGENTROUTER_API_KEY) {
    console.warn('AGENTROUTER_API_KEY not set, skipping research');
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
    'Use your knowledge to find real information. Use null for anything unknown. Never fabricate.';

  try {
    var response = await fetch('https://agentrouter.org/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.AGENTROUTER_API_KEY
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    var data = await response.json();

    if (data.error) {
      console.error('AgentRouter research error:', data.error);
      return null;
    }

    var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) return null;

    var cleaned = text.replace(/```json|```/g, '').trim();
    var research = JSON.parse(cleaned);
    research.investorName = investorName;
    research.firm = firm || null;
    research.researchedAt = new Date().toISOString();

    console.log('Research done for:', investorName);
    return research;

  } catch (err) {
    console.error('researchInvestor failed:', err.message);
    return null;
  }
}
