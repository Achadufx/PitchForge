// Shared Gemini transport. This now serves DOCUMENT ANALYSIS only
// (pages/api/analyze-documents.js and pages/api/extract-text.js).
//
// Both pitch generation and investor research moved to lib/groqClient.js.
// Document analysis stays here because it sends images and scanned PDF pages via
// Gemini's inlineData vision format, and Groq's llama models are text-only.
//
// MODEL CHOICE — change it in ONE place (or with zero code changes via env):
//   Set GEMINI_MODEL in your environment to override the default below.
//
//   gemini-3.6-flash  (default) current stable, no announced shutdown. Google's
//                     recommended replacement for both 2.0-flash and 2.5-flash.
//   gemini-2.5-flash  shutdown announced 2026-10-16. Still serving; proven
//                     against this project's key by pages/api/analyze-documents.js.
//   gemini-2.0-flash  listed by Google as SHUT DOWN (earliest 2026-06-01). Do not use.
//   gemini-1.5-flash  absent from Google's current model list. Do not use.
//
// Run `node scripts/test-gemini.js` to see exactly which models your key can reach.

var DEFAULT_MODEL = 'gemini-3.6-flash';
var API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
var DEFAULT_TIMEOUT_MS = 25000;

// Free-tier Gemini enforces per-minute request and token limits. A campaign
// fires 2 calls per investor back to back, so a 5-investor run makes 10 calls in
// seconds and the later ones get 429 RESOURCE_EXHAUSTED.
//
// Schedule is 15s / 30s / 60s. Note that the full schedule sums to 105s, which
// CANNOT complete inside a 60s serverless function — the deadline guard below
// stops the loop when the remaining budget runs out, so in practice the server
// executes roughly the first step and then returns 429. The remainder of the
// schedule is executed client-side in pages/app.js, where there is no execution
// limit and the browser can wait as long as the quota needs.
var RATE_LIMIT_RETRY_DELAYS_MS = [15000, 30000, 60000];
var RATE_LIMIT_MAX_RETRIES = RATE_LIMIT_RETRY_DELAYS_MS.length;

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function isRateLimited(status, data) {
  if (status === 429) return true;
  var apiErr = data && data.error;
  if (!apiErr) return false;
  if (apiErr.code === 429) return true;
  return String(apiErr.status || '').toUpperCase() === 'RESOURCE_EXHAUSTED';
}

// Gemini returns a RetryInfo detail telling you exactly how long to wait.
// Honoring it beats guessing — returns milliseconds, or 0 when absent.
function serverRetryDelayMs(data) {
  var details = data && data.error && data.error.details;
  if (!Array.isArray(details)) return 0;
  for (var i = 0; i < details.length; i++) {
    var d = details[i];
    if (d && typeof d['@type'] === 'string' && d['@type'].indexOf('RetryInfo') !== -1 && d.retryDelay) {
      var m = String(d.retryDelay).match(/^([0-9.]+)s$/);
      if (m) return Math.ceil(parseFloat(m[1]) * 1000);
    }
  }
  return 0;
}

export function geminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function geminiConfigError() {
  if (!process.env.GEMINI_API_KEY) {
    return 'GEMINI_API_KEY is not set. Add it to your Vercel environment variables (or .env.local for local dev).';
  }
  return null;
}

// Returns the thinkingConfig that minimizes reasoning tokens for this model, or
// null when there is no safe option. The two generations use DIFFERENT fields and
// sending both in one request is a 400 error:
//
//   Gemini 2.x flash  thinkingBudget: 0        (fully disables thinking)
//   Gemini 3.x flash  thinkingLevel: 'minimal' (lowest available; cannot be off)
//   Gemini 3.x pro    thinkingLevel: 'low'     (thinking cannot be disabled)
//   Gemini 2.5 pro    null                     (budget 0 errors, minimum is 128)
//
// This matters because thinking tokens are billed against maxOutputTokens, so an
// unconstrained reasoning model eats the budget and truncates the real answer.
function minimalThinkingConfig(model) {
  var m = String(model || '').toLowerCase();
  var isPro = m.indexOf('pro') !== -1;

  // Gemini 3.x and newer use thinkingLevel.
  if (/gemini-(3|[4-9])/.test(m)) {
    return { thinkingLevel: isPro ? 'low' : 'minimal' };
  }

  // Gemini 2.x flash accepts a hard zero.
  if (!isPro && (m.indexOf('2.5-flash') !== -1 || m.indexOf('2.0-flash') !== -1)) {
    return { thinkingBudget: 0 };
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

  // CRITICAL: thinking is ON by default on reasoning models and its tokens are
  // billed against maxOutputTokens. On a non-trivial prompt thinking can consume
  // nearly the whole budget, so the visible answer gets cut off mid-sentence with
  // finishReason MAX_TOKENS and no error. Constraining it keeps the answer inside
  // the budget.
  //
  // Must be nested under generationConfig.thinkingConfig — at the top level it is
  // silently ignored, which is exactly how the original code's `thinkingBudget`
  // did nothing.
  //
  // The correct FIELD differs by generation (see minimalThinkingConfig): 2.x uses
  // thinkingBudget, 3.x uses thinkingLevel, and sending both in one request is a
  // 400. The request is retried without the block if the API rejects it anyway.
  var thinkingCfg = opts.disableThinking === false ? null : minimalThinkingConfig(model);
  var wantsNoThinking = !!thinkingCfg;
  if (thinkingCfg) generationConfig.thinkingConfig = thinkingCfg;

  var url = API_BASE + encodeURIComponent(model) + ':generateContent?key=' +
    encodeURIComponent(process.env.GEMINI_API_KEY);

  var timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  var startedAt = Date.now();
  // Tracks which config the retries should reuse, so a thinkingConfig fallback
  // is not silently reverted by a later rate-limit retry.
  var activeConfig = generationConfig;

  async function attempt(genConfig) {
    var controller = new AbortController();
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      var r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: genConfig }),
        signal: controller.signal
      });
      var t = await r.text();
      return { response: r, bodyText: t, netError: null };
    } catch (err) {
      return {
        response: null,
        bodyText: '',
        netError: timedOut
          ? 'Gemini request timed out after ' + timeoutMs + 'ms (model ' + model + ')'
          : 'Gemini request failed: ' + (err && err.message ? err.message : String(err))
      };
    } finally {
      clearTimeout(timer);
    }
  }

  var attemptResult = await attempt(generationConfig);

  // Some models reject thinkingConfig outright. Retry once without it so an
  // unsupported knob can never take the whole pipeline down.
  if (
    wantsNoThinking &&
    attemptResult.response &&
    attemptResult.response.status === 400 &&
    /think/i.test(attemptResult.bodyText || '')
  ) {
    console.warn('[' + label + '] model ' + model +
      ' rejected thinkingConfig; retrying without it. Expect a larger maxOutputTokens to be needed.');
    var fallbackConfig = {};
    for (var k in generationConfig) {
      if (Object.prototype.hasOwnProperty.call(generationConfig, k) && k !== 'thinkingConfig') {
        fallbackConfig[k] = generationConfig[k];
      }
    }
    activeConfig = fallbackConfig;
    attemptResult = await attempt(fallbackConfig);
  }

  // --- Rate-limit retry with exponential backoff ---
  //
  // Bounded by a wall-clock deadline, not just an attempt count. A serverless
  // function is killed at its maxDuration, and research-and-pitch makes two
  // sequential calls inside one invocation — so unbounded 5s/10s/20s sleeps
  // would guarantee a hard timeout with nothing returned. When the remaining
  // budget cannot cover the next wait, we stop and report the rate limit so the
  // caller (which is not time-boxed) can back off instead.
  var deadlineAt = startedAt + (opts.deadlineMs || timeoutMs * 2);
  var rateLimitAttempts = 0;

  while (rateLimitAttempts < RATE_LIMIT_MAX_RETRIES) {
    if (attemptResult.netError || !attemptResult.response) break;

    var peeked = null;
    try {
      peeked = JSON.parse(attemptResult.bodyText);
    } catch (e) {
      peeked = null;
    }

    if (!isRateLimited(attemptResult.response.status, peeked)) break;

    var suggested = serverRetryDelayMs(peeked);
    var backoff = RATE_LIMIT_RETRY_DELAYS_MS[rateLimitAttempts];
    var waitMs = Math.max(suggested, backoff);
    var remaining = deadlineAt - Date.now();

    // Reserve room for the retry itself, not just the sleep.
    if (remaining < waitMs + 3000) {
      console.error('[' + label + '] RATE LIMITED (429) and out of server time budget: ' +
        'the next backoff step needs ' + waitMs + 'ms but only ' + Math.max(0, remaining) + 'ms ' +
        'remain before this function is killed. Returning 429 after ' + rateLimitAttempts +
        ' server-side retries so the client can continue backing off (it has no execution limit).');
      break;
    }

    rateLimitAttempts++;
    console.warn('[' + label + '] RATE LIMITED (429 RESOURCE_EXHAUSTED) by Gemini. ' +
      'Backing off ' + waitMs + 'ms then retrying (attempt ' + rateLimitAttempts + ' of ' +
      RATE_LIMIT_MAX_RETRIES + ')' +
      (suggested ? ' — server asked for ' + suggested + 'ms' : '') + '.');

    await sleep(waitMs);
    attemptResult = await attempt(activeConfig);
  }

  if (rateLimitAttempts > 0 && attemptResult.response && attemptResult.response.status === 200) {
    console.log('[' + label + '] recovered from rate limiting after ' + rateLimitAttempts + ' retry attempt(s).');
  }

  if (attemptResult.netError) {
    console.error('[' + label + '] ' + attemptResult.netError);
    return { ok: false, text: '', error: attemptResult.netError, model: model };
  }

  var response = attemptResult.response;
  var bodyText = attemptResult.bodyText;

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
    var wasRateLimited = isRateLimited(response.status, data);
    var apiMsg = wasRateLimited
      ? 'Gemini rate limit exceeded (429 RESOURCE_EXHAUSTED, model ' + model + ') after ' +
        rateLimitAttempts + ' retries. Free-tier quota is per-minute; reduce campaign size or ' +
        'space out requests. Original message: ' + (data.error.message || 'none')
      : 'Gemini API error (HTTP ' + response.status + ', model ' + model + '): ' +
        (data.error.message || JSON.stringify(data.error));

    console.error('[' + label + '] ' + apiMsg);
    if (response.status === 404) {
      console.error('[' + label + '] Model "' + model + '" was not found for this key. ' +
        'Run `node scripts/test-gemini.js` to list models your key can access, then set GEMINI_MODEL.');
    }
    return {
      ok: false, text: '', error: apiMsg, status: response.status, model: model,
      rateLimited: wasRateLimited, retryAttempts: rateLimitAttempts
    };
  }

  if (!response.ok) {
    var httpRateLimited = isRateLimited(response.status, null);
    var httpMsg = (httpRateLimited ? 'Gemini rate limit exceeded (429) — ' : '') +
      'Gemini HTTP ' + response.status + ' (model ' + model + '): ' + bodyText.substring(0, 300);
    console.error('[' + label + '] ' + httpMsg);
    return {
      ok: false, text: '', error: httpMsg, status: response.status, model: model,
      rateLimited: httpRateLimited, retryAttempts: rateLimitAttempts
    };
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

  // Surfaces how much of the budget thinking consumed — the number to look at
  // first when output comes back short or truncated.
  var usage = data.usageMetadata || {};
  var thoughtTokens = usage.thoughtsTokenCount || 0;
  if (thoughtTokens) {
    console.log('[' + label + '] thinking used ' + thoughtTokens + ' tokens of the ' +
      generationConfig.maxOutputTokens + ' output budget (' +
      (usage.candidatesTokenCount || 0) + ' went to the answer).');
  }

  if (!text) {
    var emptyMsg = 'Gemini returned no text' + (finishReason ? ' (finishReason: ' + finishReason + ')' : '') +
      ' for model ' + model;
    if (finishReason === 'MAX_TOKENS') {
      emptyMsg += '. The entire output budget was consumed' +
        (thoughtTokens ? ' by ' + thoughtTokens + ' thinking tokens' : '') +
        ' — raise maxOutputTokens or disable thinking.';
    }
    console.error('[' + label + '] ' + emptyMsg);
    return { ok: false, text: '', error: emptyMsg, finishReason: finishReason, status: response.status, model: model };
  }

  // Truncated output is a FAILURE, not a warning. Returning ok:true here is what
  // let half-written emails reach the review screen looking like real pitches.
  // Callers that can still use a partial response opt in with allowTruncated.
  if (finishReason === 'MAX_TOKENS' && !opts.allowTruncated) {
    var truncMsg = 'Gemini output was truncated at the token limit (model ' + model +
      ', maxOutputTokens ' + generationConfig.maxOutputTokens +
      (thoughtTokens ? ', ' + thoughtTokens + ' of them spent on thinking' : '') +
      '). The text ends mid-sentence, so it was rejected.';
    console.error('[' + label + '] ' + truncMsg);
    return {
      ok: false,
      text: text,
      error: truncMsg,
      finishReason: finishReason,
      truncated: true,
      status: response.status,
      model: model
    };
  }

  if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
    console.warn('[' + label + '] finishReason=' + finishReason + ' — output may be incomplete.');
  }

  return {
    ok: true,
    text: text,
    error: null,
    finishReason: finishReason,
    truncated: finishReason === 'MAX_TOKENS',
    status: response.status,
    model: model
  };
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
