export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { investorName, firm, startupName, description, ask, investorResearch } = req.body;

  if (!investorName || !startupName || !description) {
    return res.status(400).json({ error: 'investorName, startupName, and description are required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  // Build research context block — only include fields that are real and non-null
  var researchBlock = '';
  if (investorResearch) {
    var r = investorResearch;
    researchBlock = '\n\nVERIFIED INVESTOR RESEARCH (cite at least 2 of these facts in your email):\n';
    if (r.thesis) researchBlock += '- Thesis: ' + r.thesis + '\n';
    if (r.recentDeals && r.recentDeals.length > 0) researchBlock += '- Recent deals: ' + r.recentDeals.join(', ') + '\n';
    if (r.checkSize) researchBlock += '- Typical check: ' + r.checkSize + '\n';
    if (r.sectorFocus && r.sectorFocus.length > 0) researchBlock += '- Sector focus: ' + r.sectorFocus.join(', ') + '\n';
    if (r.geographyFocus && r.geographyFocus.length > 0) researchBlock += '- Geography: ' + r.geographyFocus.join(', ') + '\n';
    if (r.portfolioHighlights && r.portfolioHighlights.length > 0) researchBlock += '- Portfolio: ' + r.portfolioHighlights.join(', ') + '\n';
    if (r.publicQuote) researchBlock += '- They said publicly: "' + r.publicQuote + '"\n';
  }

  var prompt = 'Write a cold pitch email to ' + investorName + (firm ? ' at ' + firm : '') + ' about ' + startupName + '.\n\n' +
    'STARTUP: ' + startupName + '\n' +
    'WHAT WE DO: ' + description + '\n' +
    'ASK: ' + (ask || '15-minute call this week') +
    researchBlock + '\n\n' +
    'RULES:\n' +
    '- 150-200 words\n' +
    '- Line 1: Reference a SPECIFIC fact from the research above — a deal they made, something they said, their thesis\n' +
    '- Line 2-3: One vivid sentence about the problem\n' +
    '- Line 4-5: What we built + one concrete proof point (only use real traction we actually have, if none say "in active development with early clinical partners")\n' +
    '- Line 6: Specific confident ask\n' +
    '- Tone: Direct founder energy. Short punchy sentences. Zero corporate speak.\n' +
    '- NEVER say: "I hope this finds you well", "revolutionary", "disruptive", "I am reaching out", "I would love to"\n' +
    '- PORTABILITY TEST: Your opening line must be impossible to send to a different investor unchanged. If it could fit anyone, rewrite it.\n\n' +
    'OUTPUT FORMAT — respond ONLY in this exact format:\n' +
    '---SUBJECT---\n' +
    '[subject line, 6-9 words, creates FOMO or curiosity]\n' +
    '---BODY---\n' +
    '[email body]';

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 1024,
            thinkingBudget: 0
          }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Gemini error:', data.error);
      return res.status(500).json({ error: 'Generation failed', details: data.error.message });
    }

    const text = (data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text) || '';

    if (!text) {
      return res.status(500).json({ error: 'Empty response from Gemini' });
    }

    // Parse subject and body
    var subjectMatch = text.match(/---SUBJECT---\s*\n([^\n]+)/);
    var bodyMatch = text.match(/---BODY---\s*\n([\s\S]+?)(?:---|$)/);

    var subject = subjectMatch ? subjectMatch[1].trim() : startupName + ': worth 15 minutes?';
    var body = bodyMatch ? bodyMatch[1].trim() : text.trim();

    // Clean up
    body = body.replace(/^---BODY---\s*/m, '').replace(/\s*---$/, '').trim();

    if (!body || body.length < 50) {
      return res.status(500).json({ error: 'Generated body too short or invalid' });
    }

    if (subject.length > 70) subject = subject.substring(0, 67) + '...';

    console.log('Pitch generated for:', investorName, '| Research used:', !!investorResearch);

    return res.status(200).json({ subject, body });

  } catch (err) {
    console.error('generate-pitch error:', err);
    return res.status(500).json({ error: 'Pitch generation failed', details: err.message });
  }
}
