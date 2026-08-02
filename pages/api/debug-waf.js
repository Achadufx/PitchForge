export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    var response = await fetch('https://agentrouter.org/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.AGENTROUTER_API_KEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://agentrouter.org',
        'Referer': 'https://agentrouter.org/',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Say OK' }]
      })
    });

    var text = await response.text();
    var data;
    try {
      data = JSON.parse(text);
      return res.status(200).json({ success: true, response: data });
    } catch (e) {
      return res.status(200).json({ success: false, raw: text.substring(0, 500) });
    }
  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
