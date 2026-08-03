export async function researchInvestor(investorName, firm) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, skipping research');
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
    var response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
          }
        })
      }
    );

    var data = await response.json();

    if (data.error) {
      console.error('Gemini research error:', data.error);
      return null;
    }

    var text = data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;
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
