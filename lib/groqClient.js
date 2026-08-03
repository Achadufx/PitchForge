// Shared Groq transport. OpenAI-compatible chat/completions API.
//
// MODEL CHOICE — override with GROQ_MODEL, no code change needed.
//
//   llama-3.3-70b-versatile  (default) DEPRECATED by Groq on 2026-06-17 with a
//                            shutdown date of 2026-08-16. It still serves today
//                            but will start returning model_decommissioned
//                            errors after that date.
//   openai/gpt-oss-120b      Groq's recommended replacement for the above.
//   qwen/qwen3.6-27b         alternate replacement, smaller and faster.
//
// Because the shutdown is imminent, a model_decommissioned error triggers one
// automatic retry against FALLBACK_MODEL so pitch generation degrades to a
// working model instead of failing outright.
//
// Run `node scripts/test-groq.js` to list the models your key can actually reach.

var DEFAULT_MODEL = 'llama-3.3-70b-versatile';
var FALLBACK_MODEL = 'openai/gpt-oss-120b';
var API_URL = 'https://api.groq.com/openai/v1/chat/completions';
var DEFAULT_TIMEOUT_MS = 20000;

// Groq's free tier is far more generous than Gemini's, so the backoff is
// shorter. It is still bounded by a deadline for the same reason: a serverless
// function is killed at maxDuration and a sleep it cannot finish is worse than
// an early error.
var RATE_LIMIT_RETRY_DELAYS_MS = [3000, 8000];

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

export function groqModel() {
  return process.env.GROQ_MODEL || DEFAULT_MODEL;
}

export function groqConfigError() {
  if (!process.env.GROQ_API_KEY) {
    return 'GROQ_API_KEY is not set. Get one free at https://console.groq.com and add it to ' +
      'your Vercel environment variables (or .env.local for local dev).';
  }
  return null;
}

function isRateLimited(status, data) {
  if (status === 429) return true;
  var err = data && data.error;
  if (!err) return false;
  return String(err.code || '').toLowerCase() === 'rate_limit_exceeded';
}

function isDecommissioned(data) {
  var err = data && data.error;
  if (!err) return false;
  if (String(err.code || '').toLowerCase() === 'model_decommissioned') return true;
  return /decommissioned|has been deprecated/i.test(String(err.message || ''));
}

// Groq returns retry-after as a header on 429s.
function headerRetryMs(response) {
  if (!response || !response.headers) return 0;
  var raw = response.headers.get('retry-after');
  if (!raw) return 0;
  var secs = parseFloat(raw);
  if (isNaN(secs)) return 0;
  return Math.ceil(secs * 1000);
}

// Always resolves — never throws. Returns:
//   { ok, text, error, status, finishReason, truncated, rateLimited, model }
export async function callGroq(options) {
  var opts = options || {};
  var label = opts.label || 'groq';

  var configError = groqConfigError();
  if (configError) {
    console.error('[' + label + '] ' + configError);
    return { ok: false, text: '', error: configError, model: groqModel() };
  }

  var model = opts.model || groqModel();
  var timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  var startedAt = Date.now();
  var deadlineAt = startedAt + (opts.deadlineMs || timeoutMs * 2);

  var messages = opts.messages || [{ role: 'user', content: String(opts.prompt == null ? '' : opts.prompt) }];

  async function attempt(useModel) {
    var controller = new AbortController();
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; controller.abort(); }, timeoutMs);

    var payload = {
      model: useModel,
      messages: messages,
      temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
      max_tokens: opts.maxTokens || 1024
    };
    if (opts.jsonMode) payload.response_format = { type: 'json_object' };

    try {
      var r = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      var t = await r.text();
      return { response: r, bodyText: t, netError: null };
    } catch (err) {
      return {
        response: null,
        bodyText: '',
        netError: timedOut
          ? 'Groq request timed out after ' + timeoutMs + 'ms (model ' + useModel + ')'
          : 'Groq request failed: ' + (err && err.message ? err.message : String(err))
      };
    } finally {
      clearTimeout(timer);
    }
  }

  var activeModel = model;
  var attemptResult = await attempt(activeModel);
  var rateLimitAttempts = 0;

  // --- Rate-limit backoff, bounded by the function's time budget ---
  while (rateLimitAttempts < RATE_LIMIT_RETRY_DELAYS_MS.length) {
    if (attemptResult.netError || !attemptResult.response) break;

    var peeked = null;
    try { peeked = JSON.parse(attemptResult.bodyText); } catch (e) { peeked = null; }

    if (!isRateLimited(attemptResult.response.status, peeked)) break;

    var suggested = headerRetryMs(attemptResult.response);
    var waitMs = Math.max(suggested, RATE_LIMIT_RETRY_DELAYS_MS[rateLimitAttempts]);
    var remaining = deadlineAt - Date.now();

    if (remaining < waitMs + 2000) {
      console.error('[' + label + '] RATE LIMITED (429) by Groq and out of time budget: ' +
        'needed ' + waitMs + 'ms but only ' + Math.max(0, remaining) + 'ms remain. ' +
        'Returning 429 so the client can continue backing off.');
      break;
    }

    rateLimitAttempts++;
    console.warn('[' + label + '] RATE LIMITED (429) by Groq. Waiting ' + waitMs +
      'ms then retrying (attempt ' + rateLimitAttempts + ' of ' +
      RATE_LIMIT_RETRY_DELAYS_MS.length + ')' +
      (suggested ? ' — retry-after header said ' + suggested + 'ms' : '') + '.');

    await sleep(waitMs);
    attemptResult = await attempt(activeModel);
  }

  if (attemptResult.netError) {
    console.error('[' + label + '] ' + attemptResult.netError);
    return { ok: false, text: '', error: attemptResult.netError, model: activeModel };
  }

  var response = attemptResult.response;
  var bodyText = attemptResult.bodyText;
  var data = null;
  try {
    data = JSON.parse(bodyText);
  } catch (parseErr) {
    var rawMsg = 'Groq returned non-JSON (HTTP ' + response.status + '): ' + bodyText.substring(0, 300);
    console.error('[' + label + '] ' + rawMsg);
    return { ok: false, text: '', error: rawMsg, status: response.status, model: activeModel };
  }

  // --- Auto-fallback when the configured model has been shut down ---
  // llama-3.3-70b-versatile is scheduled for shutdown on 2026-08-16, so this
  // path is expected to start firing without any code change.
  if (isDecommissioned(data) && activeModel !== FALLBACK_MODEL) {
    console.error('[' + label + '] Model "' + activeModel + '" has been DECOMMISSIONED by Groq. ' +
      'Retrying once with "' + FALLBACK_MODEL + '". Set GROQ_MODEL=' + FALLBACK_MODEL +
      ' to make this permanent and skip the wasted call.');
    activeModel = FALLBACK_MODEL;
    attemptResult = await attempt(activeModel);

    if (attemptResult.netError) {
      console.error('[' + label + '] ' + attemptResult.netError);
      return { ok: false, text: '', error: attemptResult.netError, model: activeModel };
    }
    response = attemptResult.response;
    bodyText = attemptResult.bodyText;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      var fbMsg = 'Groq fallback returned non-JSON (HTTP ' + response.status + '): ' + bodyText.substring(0, 300);
      console.error('[' + label + '] ' + fbMsg);
      return { ok: false, text: '', error: fbMsg, status: response.status, model: activeModel };
    }
  }

  if (data && data.error) {
    var wasRateLimited = isRateLimited(response.status, data);
    var apiMsg = (wasRateLimited ? 'Groq rate limit exceeded (429) after ' + rateLimitAttempts + ' retries: ' : '') +
      'Groq API error (HTTP ' + response.status + ', model ' + activeModel + '): ' +
      (data.error.message || JSON.stringify(data.error));
    console.error('[' + label + '] ' + apiMsg);
    return {
      ok: false, text: '', error: apiMsg, status: response.status, model: activeModel,
      rateLimited: wasRateLimited, retryAttempts: rateLimitAttempts
    };
  }

  if (!response.ok) {
    var httpRateLimited = response.status === 429;
    var httpMsg = 'Groq HTTP ' + response.status + ' (model ' + activeModel + '): ' + bodyText.substring(0, 300);
    console.error('[' + label + '] ' + httpMsg);
    return {
      ok: false, text: '', error: httpMsg, status: response.status, model: activeModel,
      rateLimited: httpRateLimited, retryAttempts: rateLimitAttempts
    };
  }

  var choice = data.choices && data.choices[0];
  var text = choice && choice.message && typeof choice.message.content === 'string'
    ? choice.message.content
    : '';
  var finishReason = choice && choice.finish_reason;

  if (!text) {
    var emptyMsg = 'Groq returned no text' + (finishReason ? ' (finish_reason: ' + finishReason + ')' : '') +
      ' for model ' + activeModel;
    console.error('[' + label + '] ' + emptyMsg);
    return {
      ok: false, text: '', error: emptyMsg, finishReason: finishReason,
      status: response.status, model: activeModel
    };
  }

  // Truncated output is a failure — a half-written email must not reach an
  // investor's inbox looking finished.
  if (finishReason === 'length' && !opts.allowTruncated) {
    var truncMsg = 'Groq output was truncated at the token limit (model ' + activeModel +
      ', max_tokens ' + (opts.maxTokens || 1024) + '). Text ends mid-sentence, so it was rejected.';
    console.error('[' + label + '] ' + truncMsg);
    return {
      ok: false, text: text, error: truncMsg, finishReason: finishReason,
      truncated: true, status: response.status, model: activeModel
    };
  }

  return {
    ok: true, text: text, error: null, finishReason: finishReason,
    truncated: false, status: response.status, model: activeModel
  };
}

// Lists model IDs the key can reach — the definitive answer to "which model
// name should I use", asked of Groq rather than guessed.
export async function listGroqModels() {
  var configError = groqConfigError();
  if (configError) return { ok: false, models: [], error: configError };

  try {
    var response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY }
    });
    var bodyText = await response.text();
    var data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      return { ok: false, models: [], error: 'Non-JSON from models endpoint: ' + bodyText.substring(0, 300) };
    }
    if (data.error) return { ok: false, models: [], error: data.error.message || 'models list failed' };
    var names = (data.data || []).map(function (m) { return String(m.id || ''); }).filter(Boolean);
    return { ok: true, models: names, error: null };
  } catch (err) {
    return { ok: false, models: [], error: err && err.message ? err.message : String(err) };
  }
}
