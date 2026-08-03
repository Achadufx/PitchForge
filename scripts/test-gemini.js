// Preflight check for the Gemini pipeline. Run BEFORE debugging anything else:
//
//   node scripts/test-gemini.js
//
// Reads GEMINI_API_KEY from the environment or from .env.local / .env in the
// project root. The key is never printed — only its length and last 4 chars.
//
// It answers three questions in order:
//   1. Is the key present and valid?
//   2. Which models can this key actually reach?  <- settles the model-name question
//   3. Does the configured model round-trip, and is the response shape as expected?

const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const roots = ['.env.local', '.env'];
  for (const file of roots) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
    console.log('Loaded env from ' + file);
  }
}

loadDotEnv();

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Candidates in preference order. The script reports which ones actually work,
// so you can set GEMINI_MODEL with evidence instead of guessing.
const CANDIDATES = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

function line() {
  console.log('-'.repeat(66));
}

async function main() {
  line();
  console.log('GEMINI PREFLIGHT');
  line();

  if (!KEY) {
    console.error('FAIL: GEMINI_API_KEY is not set.');
    console.error('');
    console.error('Fix one of these, then re-run:');
    console.error('  - create .env.local in the project root containing:');
    console.error('      GEMINI_API_KEY=your_key_here');
    console.error('  - or set it for one command:');
    console.error('      PowerShell:  $env:GEMINI_API_KEY="..."; node scripts/test-gemini.js');
    console.error('      bash:        GEMINI_API_KEY=... node scripts/test-gemini.js');
    process.exit(1);
  }

  console.log('Key present: yes (length ' + KEY.length + ', ends ...' + KEY.slice(-4) + ')');
  console.log('Configured model (GEMINI_MODEL): ' + MODEL);
  line();

  // --- 1. Which models does this key actually have? ---
  console.log('STEP 1  Listing models your key can reach...');
  let reachable = [];
  try {
    const res = await fetch(BASE + '?key=' + encodeURIComponent(KEY) + '&pageSize=200');
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('  FAIL: non-JSON response (HTTP ' + res.status + '): ' + text.slice(0, 300));
      process.exit(1);
    }
    if (data.error) {
      console.error('  FAIL: ' + (data.error.message || JSON.stringify(data.error)));
      if (res.status === 400 || res.status === 403) {
        console.error('  This usually means the key is invalid, restricted, or the');
        console.error('  Generative Language API is not enabled for its project.');
      }
      process.exit(1);
    }
    reachable = (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => String(m.name || '').replace('models/', ''));

    console.log('  OK: ' + reachable.length + ' models support generateContent.');
    const flash = reachable.filter(n => n.includes('flash'));
    console.log('  Flash models available to you:');
    if (flash.length) {
      flash.forEach(n => console.log('    - ' + n));
    } else {
      console.log('    (none — unexpected; full list below)');
      reachable.slice(0, 40).forEach(n => console.log('    - ' + n));
    }
  } catch (err) {
    console.error('  FAIL: ' + err.message);
    process.exit(1);
  }

  line();

  // --- 2. Is the configured model among them? ---
  console.log('STEP 2  Checking configured model...');
  if (reachable.includes(MODEL)) {
    console.log('  OK: "' + MODEL + '" is reachable.');
  } else {
    console.log('  WARNING: "' + MODEL + '" is NOT in your reachable list.');
    const suggestion = CANDIDATES.find(c => reachable.includes(c));
    if (suggestion) {
      console.log('  Recommended: set GEMINI_MODEL=' + suggestion);
      console.log('  (in .env.local for local dev, and in Vercel env vars for production)');
    }
  }

  line();

  // --- 3. Real round-trip against the configured model ---
  console.log('STEP 3  Live round-trip against "' + MODEL + '"...');
  try {
    const res = await fetch(
      BASE + '/' + encodeURIComponent(MODEL) + ':generateContent?key=' + encodeURIComponent(KEY),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 16 }
        })
      }
    );
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('  FAIL: non-JSON response (HTTP ' + res.status + '): ' + text.slice(0, 300));
      process.exit(1);
    }
    if (data.error) {
      console.error('  FAIL: ' + (data.error.message || JSON.stringify(data.error)));
      process.exit(1);
    }

    // Verify the parsing path the app relies on.
    const candidate = data.candidates && data.candidates[0];
    const parts = candidate && candidate.content && candidate.content.parts;
    const joined = (parts || []).map(p => p.text || '').join('');

    console.log('  HTTP ' + res.status);
    console.log('  candidates[0].content.parts length: ' + (parts ? parts.length : 'MISSING'));
    console.log('  finishReason: ' + (candidate ? candidate.finishReason : 'MISSING'));
    console.log('  joined text: ' + JSON.stringify(joined.trim()));

    if (!joined.trim()) {
      console.error('  FAIL: response contained no text.');
      process.exit(1);
    }
    if (parts.length > 1) {
      console.log('  NOTE: response arrived in ' + parts.length + ' parts — reading parts[0]');
      console.log('        alone would have truncated it. lib/geminiClient.js joins all parts.');
    }
    console.log('  OK: round-trip succeeded and the parsing path is correct.');
  } catch (err) {
    console.error('  FAIL: ' + err.message);
    process.exit(1);
  }

  line();
  console.log('PREFLIGHT PASSED — key and model are working.');
  console.log('If pitches still fail, the cause is downstream: check the server');
  console.log('logs for [researchInvestor] / [generatePitch] error lines.');
  line();
}

main().catch(err => {
  console.error('Unexpected failure: ' + err.message);
  process.exit(1);
});
