export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    var response = await fetch('https://agentrouter.org/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + process.env.AGENTROUTER_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    var text = await response.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(200).json({ raw: text.substring(0, 1000) });
    }

    return res.status(200).json({ models: data });
  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
