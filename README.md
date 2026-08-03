# ⚡ PitchBlast

AI-powered investor outreach. Upload a CSV of investors, describe your startup, and send personalized cold pitches in minutes.

## Stack

- **Frontend + API routes**: Next.js 14 (deployed on Vercel)
- **Investor research**: Google Gemini (`gemini-3.6-flash`)
- **Pitch writing**: Groq (`llama-3.3-70b-versatile`)
- **Document analysis**: Google Gemini (vision-capable)
- **Email**: Resend for delivery

The two AI steps are split across providers on purpose, matching each to what it
is better at:

- **Gemini for research.** Newer training cutoff and better recall of specific
  VCs and recent deals, especially outside the US. Research is one call per
  investor and tolerates a tighter quota, because a failed research call still
  leaves a usable pitch.
- **Groq for writing.** Its free tier is far more generous, which matters for the
  step that runs on every investor and must not fail.

Gemini also handles the document-upload step, which reads pitch decks and scanned
PDFs — that needs a vision model, and Groq's llama models are text-only.

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
| `GROQ_API_KEY` | **Yes** | From [console.groq.com](https://console.groq.com). Writes the pitch emails — without it nothing is produced. |
| `GEMINI_API_KEY` | Strongly recommended | From [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Investor research and document upload. Without it pitches still generate, but skip research and open on the problem instead of a verified fact. |
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
`/api/test-gemini` to confirm the Gemini key and model resolve.

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
- Gemini's free tier is per-minute limited. Research is one call per investor, so
  a long campaign can hit it — when that happens research is skipped for that
  investor and the pitch is still written, just without verified specifics.
- `vercel.json` sets API routes to a 60s timeout. `/api/research-and-pitch` makes
  one Gemini call and one Groq call in sequence and budgets itself to stay inside
  that limit.
- `llama-3.3-70b-versatile` was deprecated by Groq on 2026-06-17 with a shutdown
  date of 2026-08-16. `lib/groqClient.js` falls back to `openai/gpt-oss-120b`
  automatically once it is decommissioned; set `GROQ_MODEL` to skip the wasted
  first call.
- Investor research works from training data with a fixed cutoff and no browsing,
  so for lesser-known investors it will often return "unknown" rather than facts.
  That is intentional: the prompt forbids guessing, because a fabricated deal or
  quote goes straight into a real email. When research comes back empty the pitch
  opens on the problem instead of faking familiarity.
