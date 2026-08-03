// Shared Gemini transport for every Gemini caller in this app.
//
// MODEL CHOICE — change it in ONE place (or with zero code changes via env):
//   Set GEMINI_MODEL in your environment to override the default below.
//
//   gemini-2.5-flash  (default) shutdown announced 2026-10-16. Already proven
//                     against this project's key by pages/api/analyze-documents.js.
//   gemini-3.6-flash  current stable, no announced shutdown. Google's recommended
//                     replacement for both 2.0-flash and 2.5-flash.
//   gemini-2.0-flash  listed by Google as SHUT DOWN (earliest 2026-06-01). Do not use.
//   gemini-1.5-flash  absent from Google's current model list. Do not use.
//
// Run `node scripts/test-gemini.js` to see exactly which models your key can reach.

var DEFAULT_MODEL = 'gemini-2.5-flash';
var API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
var DEFAULT_TIMEOUT_MS = 25000;

export function geminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function geminiConfigError() {
  if (!process.env.GEMINI_API_KEY) {
    return 'GEMINI_API_KEY is not set. Add it to your Vercel environment variables (or .env.local for local dev).';
  }
  return null;
}

// Pulls text out of a Gemini response, joining EVERY part rather than reading
// parts[0] only — a multi-part response otherwise silently yields a fragment.
function extractText(data) {
  var candidate = data && data.candidates && data.candidates[0];
  if (!candidate || !candidate.content || !candidate.content.parts) return '';
  var parts = candidate.content.parts;
  var out = '';
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] && typeof parts[i].text === 'string') out += parts[i].text;
  }
  return out;
}

// Always resolves — never throws. Returns:
//   { ok, text, error, status, finishReason, blockReason, model }
export async function callGemini(options) {
  var opts = options || {};
  var model = opts.model || geminiModel();
  var label = opts.label || 'gemini';

  var configError = geminiConfigError();
  if (configError) {
    console.error('[' + label + '] ' + configError);
    return { ok: false, text: '', error: configError, model: model };
  }

  var parts = opts.parts || [{ text: String(opts.prompt == null ? '' : opts.prompt) }];

  var generationConfig = {
    temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
    maxOutputTokens: opts.maxOutputTokens || 1024
  };
  // Forces syntactically valid JSON out of the model, which removes most
  // markdown-fence and prose-wrapper parsing failures at the source.
  if (opts.jsonMode) generationConfig.responseMimeType = 'application/json';

  var url = API_BASE + encodeURIComponent(model) + ':generateContent?key=' +
    encodeURIComponent(process.env.GEMINI_API_KEY);

  var timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  var controller = new AbortController();
  var timedOut = false;
  var timer = setTimeout(function () { timedOut = true; controller.abort(); }, timeoutMs);

  var response = null;
  var bodyText = '';

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: generationConfig }),
      signal: controller.signal
    });
    bodyText = await response.text();
  } catch (err) {
    var netMsg = timedOut
      ? 'Gemini request timed out after ' + timeoutMs + 'ms (model ' + model + ')'
      : 'Gemini request failed: ' + (err && err.message ? err.message : String(err));
    console.error('[' + label + '] ' + netMsg);
    return { ok: false, text: '', error: netMsg, model: model };
  } finally {
    clearTimeout(timer);
  }

  var data = null;
  try {
    data = JSON.parse(bodyText);
  } catch (parseErr) {
    // Non-JSON body: usually an HTML error page, proxy, or WAF block.
    var rawMsg = 'Gemini returned non-JSON (HTTP ' + response.status + '): ' +
      bodyText.substring(0, 300);
    console.error('[' + label + '] ' + rawMsg);
    return { ok: false, text: '', error: rawMsg, status: response.status, model: model };
  }

  if (data && data.error) {
    var apiMsg = 'Gemini API error (HTTP ' + response.status + ', model ' + model + '): ' +
      (data.error.message || JSON.stringify(data.error));
    console.error('[' + label + '] ' + apiMsg);
    if (response.status === 404) {
      console.error('[' + label + '] Model "' + model + '" was not found for this key. ' +
        'Run `node scripts/test-gemini.js` to list models your key can access, then set GEMINI_MODEL.');
    }
    return { ok: false, text: '', error: apiMsg, status: response.status, model: model };
  }

  if (!response.ok) {
    var httpMsg = 'Gemini HTTP ' + response.status + ' (model ' + model + '): ' + bodyText.substring(0, 300);
    console.error('[' + label + '] ' + httpMsg);
    return { ok: false, text: '', error: httpMsg, status: response.status, model: model };
  }

  var blockReason = data.promptFeedback && data.promptFeedback.blockReason;
  if (blockReason) {
    var blockMsg = 'Gemini blocked the prompt (' + blockReason + ')';
    console.error('[' + label + '] ' + blockMsg);
    return { ok: false, text: '', error: blockMsg, blockReason: blockReason, status: response.status, model: model };
  }

  var candidate = data.candidates && data.candidates[0];
  var finishReason = candidate && candidate.finishReason;
  var text = extractText(data);

  if (!text) {
    var emptyMsg = 'Gemini returned no text' + (finishReason ? ' (finishReason: ' + finishReason + ')' : '') +
      ' for model ' + model;
    console.error('[' + label + '] ' + emptyMsg);
    return { ok: false, text: '', error: emptyMsg, finishReason: finishReason, status: response.status, model: model };
  }

  if (finishReason && finishReason !== 'STOP') {
    console.warn('[' + label + '] finishReason=' + finishReason + ' — output may be truncated.');
  }

  return { ok: true, text: text, error: null, finishReason: finishReason, status: response.status, model: model };
}

// Minimal round-trip check used by the diagnostics in scripts/test-gemini.js
// and pages/api/test-gemini.js. Confirms key + model before the pipeline runs.
export async function verifyGeminiAccess() {
  var model = geminiModel();
  var result = await callGemini({
    prompt: 'Reply with exactly: OK',
    temperature: 0,
    maxOutputTokens: 16,
    timeoutMs: 15000,
    label: 'gemini-preflight'
  });
  return {
    ok: result.ok,
    model: model,
    reply: result.text ? result.text.trim() : '',
    error: result.error
  };
}

// Lists model IDs the key can actually reach. This is the definitive answer to
// "which model name should I use" — it asks Google instead of guessing.
export async function listGeminiModels() {
  var configError = geminiConfigError();
  if (configError) return { ok: false, models: [], error: configError };

  try {
    var response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' +
      encodeURIComponent(process.env.GEMINI_API_KEY) + '&pageSize=200'
    );
    var bodyText = await response.text();
    var data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      return { ok: false, models: [], error: 'Non-JSON from models endpoint: ' + bodyText.substring(0, 300) };
    }
    if (data.error) return { ok: false, models: [], error: data.error.message || 'models list failed' };

    var names = (data.models || [])
      .filter(function (m) {
        return (m.supportedGenerationMethods || []).indexOf('generateContent') !== -1;
      })
      .map(function (m) { return String(m.name || '').replace('models/', ''); });

    return { ok: true, models: names, error: null };
  } catch (err) {
    return { ok: false, models: [], error: err && err.message ? err.message : String(err) };
  }
}
