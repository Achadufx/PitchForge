# ⚡ PitchBlast

AI-powered investor outreach. Upload a CSV of investors, describe your startup, and send personalized cold pitches in minutes.

## Stack

- **Frontend + API routes**: Next.js 14 (deployed on Vercel)
- **AI**: Groq (llama3-70b) for pitch generation
- **Email**: Resend for delivery

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

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | From [console.groq.com](https://console.groq.com) |
| `RESEND_API_KEY` | From [resend.com](https://resend.com) |
| `SENDER_EMAIL` | A verified Resend domain address |
| `SENDER_NAME` | Display name (e.g. PitchBlast) |

### 4. Deploy

Click **Deploy**. Done. Your app is live.

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
- Groq's free tier is generous — llama3-70b handles 100+ pitches easily.
- Vercel's hobby tier serverless functions have a 10s timeout; `vercel.json` bumps API routes to 30s for large batches.
