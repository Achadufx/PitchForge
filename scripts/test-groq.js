// Preflight check for the Groq pitch pipeline. Run BEFORE debugging anything:
//
//   node scripts/test-groq.js
//
// Reads GROQ_API_KEY from the environment or .env.local / .env. The key is never
// printed — only its length and last 4 chars.
//
// Answers three questions:
//   1. Is the key present and valid?
//   2. Which models can this key reach?  <- settles the model-name question
//   3. Does the configured model round-trip with the expected response shape?

const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
    console.log('Loaded env from ' + file);
  }
}

loadDotEnv();

const KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const BASE = 'https://api.groq.com/openai/v1';

// Preference order. The script reports which actually work so GROQ_MODEL can be
// set from evidence rather than guesswork.
const CANDIDATES = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile'
];

function line() { console.log('-'.repeat(66)); }

async function main() {
  line();
  console.log('GROQ PREFLIGHT');
  line();

  if (!KEY) {
    console.error('FAIL: GROQ_API_KEY is not set.');
    console.error('');
    console.error('Get a free key at https://console.groq.com, then either:');
    console.error('  - create .env.local containing:  GROQ_API_KEY=your_key_here');
    console.error('  - or set it for one command:');
    console.error('      PowerShell:  $env:GROQ_API_KEY="..."; node scripts/test-groq.js');
    console.error('      bash:        GROQ_API_KEY=... node scripts/test-groq.js');
    process.exit(1);
  }

  console.log('Key present: yes (length ' + KEY.length + ', ends ...' + KEY.slice(-4) + ')');
  console.log('Configured model (GROQ_MODEL): ' + MODEL);
  line();

  console.log('STEP 1  Listing models your key can reach...');
  let reachable = [];
  try {
    const res = await fetch(BASE + '/models', {
      headers: { 'Authorization': 'Bearer ' + KEY }
    });
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
      if (res.status === 401) console.error('  The key appears to be invalid or revoked.');
      process.exit(1);
    }
    reachable = (data.data || []).map(m => String(m.id || '')).filter(Boolean).sort();
    console.log('  OK: ' + reachable.length + ' models reachable:');
    reachable.forEach(n => console.log('    - ' + n));
  } catch (err) {
    console.error('  FAIL: ' + err.message);
    process.exit(1);
  }

  line();
  console.log('STEP 2  Checking configured model...');
  if (reachable.includes(MODEL)) {
    console.log('  OK: "' + MODEL + '" is reachable.');
    if (MODEL === 'llama-3.3-70b-versatile') {
      console.log('  NOTE: Groq deprecated this model on 2026-06-17 with a shutdown');
      console.log('        date of 2026-08-16. It works now but will stop. Plan to set');
      console.log('        GROQ_MODEL=openai/gpt-oss-120b before then. lib/groqClient.js');
      console.log('        falls back automatically once it is decommissioned.');
    }
  } else {
    console.log('  WARNING: "' + MODEL + '" is NOT reachable with this key.');
    const suggestion = CANDIDATES.find(c => reachable.includes(c)) || reachable[0];
    if (suggestion) console.log('  Recommended: set GROQ_MODEL=' + suggestion);
  }

  line();
  console.log('STEP 3  Live round-trip against "' + MODEL + '"...');
  try {
    const res = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + KEY
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
        temperature: 0,
        max_tokens: 16
      })
    });
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

    // Verify the exact parsing path lib/groqClient.js relies on.
    const choice = data.choices && data.choices[0];
    const content = choice && choice.message && choice.message.content;

    console.log('  HTTP ' + res.status);
    console.log('  choices[0].message.content: ' + JSON.stringify(content));
    console.log('  finish_reason: ' + (choice ? choice.finish_reason : 'MISSING'));

    if (!content) {
      console.error('  FAIL: response contained no content.');
      process.exit(1);
    }
    console.log('  OK: round-trip succeeded and the parsing path is correct.');
  } catch (err) {
    console.error('  FAIL: ' + err.message);
    process.exit(1);
  }

  line();
  console.log('PREFLIGHT PASSED — Groq key and model are working.');
  console.log('If pitches still fail, check server logs for [generatePitch] lines.');
  line();
}

main().catch(err => {
  console.error('Unexpected failure: ' + err.message);
  process.exit(1);
});
