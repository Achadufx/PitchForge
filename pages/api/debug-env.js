export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Check env var exists
  var keyExists = !!process.env.AGENTROUTER_API_KEY;
  var keyPrefix = process.env.AGENTROUTER_API_KEY ? process.env.AGENTROUTER_API_KEY.substring(0, 8) + '...' : 'NOT SET';

  // Try a minimal AgentRouter call
  var agentTest = null;
  var agentError = null;

  if (keyExists) {
    try {
      var response = await fetch('https://agentrouter.org/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.AGENTROUTER_API_KEY
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 20,
          messages: [{ role: 'user', content: 'Say OK' }]
        })
      });
      var data = await response.json();
      agentTest = data;
    } catch (err) {
      agentError = err.message;
    }
  }

  return res.status(200).json({
    keyExists: keyExists,
    keyPrefix: keyPrefix,
    agentRouterResponse: agentTest,
    agentRouterError: agentError
  });
}
