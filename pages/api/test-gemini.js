import { verifyGeminiAccess, listGeminiModels, geminiModel } from '../../lib/geminiClient';

// Deployed preflight for the Gemini pipeline. Hit this on Vercel where the key
// lives to confirm key + model before debugging the pipeline itself:
//   GET  /api/test-gemini            -> round-trip the configured model
//   GET  /api/test-gemini?models=1   -> also list every reachable model
//
// Deliberately reports no key material — not even a prefix. The old
// /api/debug-env leaked a key prefix to anyone who hit the URL.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  var result = { configuredModel: geminiModel() };

  try {
    var access = await verifyGeminiAccess();
    result.keyConfigured = !process.env.GEMINI_API_KEY ? false : true;
    result.ok = access.ok;
    result.reply = access.reply;
    result.error = access.error || null;
  } catch (err) {
    result.ok = false;
    result.error = 'Preflight threw: ' + (err && err.message ? err.message : String(err));
  }

  if (req.query && req.query.models) {
    try {
      var list = await listGeminiModels();
      result.reachableModels = list.models;
      result.modelsError = list.error || null;
      result.configuredModelReachable = list.ok
        ? list.models.indexOf(result.configuredModel) !== -1
        : null;
    } catch (err) {
      result.modelsError = err && err.message ? err.message : String(err);
    }
  }

  return res.status(result.ok ? 200 : 500).json(result);
}
