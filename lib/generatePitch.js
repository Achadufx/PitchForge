export async function generatePitch(investorName, firm, startupName, description, ask, research) {
  var researchBlock = '';

  if (research) {
    researchBlock = '\n\nVERIFIED INVESTOR RESEARCH (you MUST cite at least 2 specific facts below):\n';
    if (research.thesis) researchBlock += '- Thesis: ' + research.thesis + '\n';
    if (research.recentDeals && research.recentDeals.length) researchBlock += '- Recent deals: ' + research.recentDeals.join(', ') + '\n';
    if (research.checkSize) researchBlock += '- Typical check: ' + research.checkSize + '\n';
    if (research.sectorFocus && research.sectorFocus.length) researchBlock += '- Sector focus: ' + research.sectorFocus.join(', ') + '\n';
    if (research.geographyFocus && research.geographyFocus.length) researchBlock += '- Geography: ' + research.geographyFocus.join(', ') + '\n';
    if (research.portfolioHighlights && research.portfolioHighlights.length) researchBlock += '- Portfolio: ' + research.portfolioHighlights.join(', ') + '\n';
    if (research.publicQuote) researchBlock += '- They said: "' + research.publicQuote + '"\n';
  }

  var prompt = 'Write a cold pitch email to ' + investorName + (firm ? ' at ' + firm : '') + ' about ' + startupName + '.\n\n' +
    'STARTUP: ' + startupName + '\n' +
    'WHAT WE DO: ' + description + '\n' +
    'ASK: ' + (ask || '15-minute call this week') +
    researchBlock + '\n\n' +
    'RULES:\n' +
    '- 150-200 words\n' +
    '- Line 1: Reference a SPECIFIC fact from the research — a deal, a quote, their thesis. Not generic.\n' +
    '- Line 2-3: The problem in one vivid sentence\n' +
    '- Line 4-5: What we built + one honest proof point (no fabricated numbers)\n' +
    '- Line 6: Confident specific ask\n' +
    '- PORTABILITY TEST: Opening line must be impossible to send to a different investor unchanged\n' +
    '- Never say: "I hope this finds you well", "revolutionary", "disruptive", "I am reaching out"\n' +
    '- Short punchy sentences. Sound like a text from someone brilliant.\n\n' +
    'OUTPUT — respond ONLY in this format:\n' +
    '---SUBJECT---\n' +
    '[6-9 word subject, creates FOMO or curiosity]\n' +
    '---BODY---\n' +
    '[email body]';

  try {
    var response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 1024, thinkingBudget: 0 }
        })
      }
    );

    var data = await response.json();

    if (data.error) {
      console.error('Gemini error:', data.error.message);
      return null;
    }

    var text = (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text
    ) || '';

    if (!text) return null;

    var subjectMatch = text.match(/---SUBJECT---\s*\n([^\n]+)/);
    var bodyMatch = text.match(/---BODY---\s*\n([\s\S]+?)(?:---|$)/);

    var subject = subjectMatch ? subjectMatch[1].trim() : startupName + ': worth 15 minutes?';
    var body = bodyMatch ? bodyMatch[1].trim() : text.trim();

    body = body.replace(/^---BODY---\s*/m, '').replace(/\s*---$/, '').trim();
    if (subject.length > 70) subject = subject.substring(0, 67) + '...';

    if (!body || body.length < 50) return null;

    return { subject: subject, body: body };

  } catch (err) {
    console.error('generatePitch failed:', err.message);
    return null;
  }
}
