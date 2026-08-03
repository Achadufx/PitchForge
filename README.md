# ⚡ PitchBlast

AI-powered investor outreach. Upload a CSV of investors, describe your startup, and send personalized cold pitches in minutes.

## Stack

- **Frontend + API routes**: Next.js 14 (deployed on Vercel)
- **Pitch generation**: Groq (`llama-3.3-70b-versatile`)
- **Investor research**: Groq (same model)
- **Document analysis**: Google Gemini (`gemini-3.6-flash`) — vision-capable
- **Email**: Resend for delivery

The whole pitch pipeline runs on Groq. Gemini's free tier was too restrictive to
serve research and pitching in one campaign, so both moved to Groq's more
generous free tier.

Gemini is still used for the document-upload step, which reads pitch decks and
scanned PDFs — that needs a vision model, and Groq's llama models are text-only.
If you never upload documents, you do not need a Gemini key.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create pitchblast --public --push
```

### 2. Import on Vercel

Go to [vercel.com/new](https://vercel.com/new) → Import your GitHub repo → Vercel auto-detects Next.js.

### 3. Add Environment Variables

In Vercel project settings → **Environment Variables**, add:

| Variable | Required | Value |
|---|---|---|
| `GROQ_API_KEY` | **Yes** | From [console.groq.com](https://console.groq.com). Runs research **and** pitch generation — without it nothing is produced. |
| `GEMINI_API_KEY` | Only for uploads | From [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Needed by the document-upload step (vision). Not used by pitching or research. |
| `RESEND_API_KEY` | Yes, to send | From [resend.com](https://resend.com) |
| `SENDER_EMAIL` | Yes, to send | A verified Resend domain address |
| `SENDER_NAME` | No | Display name (e.g. PitchBlast) |
| `GROQ_MODEL` | No | Override the default Groq model |
| `GEMINI_MODEL` | No | Override the default Gemini model |

Supabase, Stripe, and Apify keys are additionally required for auth, billing,
and investor scraping — see `.env.example` for the full list.

### 4. Deploy

Click **Deploy**. Done. Your app is live.

Then hit `/api/version` to confirm which commit is actually running, and
`/api/test-gemini` to confirm the Gemini key and model resolve (document uploads
only — the pitch pipeline itself needs `GROQ_API_KEY`).

---

## Verifying your keys

Before debugging the pipeline, confirm each provider works:

```bash
node scripts/test-groq.js     # lists reachable Groq models, live round-trip
node scripts/test-gemini.js   # same for Gemini
```

Both print the models your key can actually reach, which is the fastest way to
settle a "model not found" error. Neither prints key material.

---

## Local Development

```bash
cp .env.example .env.local
# Fill in your keys in .env.local

npm install
npm run dev
# Open http://localhost:3000
```

---

## CSV Format

Your investor CSV must have at minimum:

```
name,email,firm
John Smith,john@a16z.com,Andreessen Horowitz
Jane Doe,jane@sequoia.com,Sequoia Capital
```

`firm` is optional but improves pitch personalization.

---

## Notes

- Resend's free tier requires a verified domain for the sender address.
- Groq's free tier is generous and comfortably handles a full campaign. Campaigns
  still pace themselves between investors; if a call is rate-limited the client
  backs off and retries rather than failing.
- Gemini is only reached by the document-upload step, which is one call per
  upload rather than one per investor, so its per-minute limit is not a
  bottleneck.
- `vercel.json` sets API routes to a 60s timeout. `/api/research-and-pitch` makes
  two sequential Groq calls and budgets itself to stay inside that limit.
- `llama-3.3-70b-versatile` was deprecated by Groq on 2026-06-17 with a shutdown
  date of 2026-08-16. `lib/groqClient.js` falls back to `openai/gpt-oss-120b`
  automatically once it is decommissioned; set `GROQ_MODEL` to skip the wasted
  first call.
- Investor research runs on a model with no web access and a fixed training
  cutoff, so for lesser-known investors it will often return "unknown" rather
  than facts. That is intentional: the prompt forbids guessing, because a
  fabricated deal or quote goes straight into a real email. When research comes
  back empty the pitch opens on the problem instead of faking familiarity.
