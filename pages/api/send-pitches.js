import { Resend } from "resend";

const SENDER_EMAIL = process.env.SENDER_EMAIL || "pitchblast@onresend.com";
const SENDER_NAME = process.env.SENDER_NAME || "PitchBlast";

function isValidEmail(value) {
  if (!value || typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pitches, senderName } = req.body || {};

  if (!pitches || !Array.isArray(pitches) || pitches.length === 0) {
    return res.status(400).json({ error: "No pitches provided" });
  }

  // Previously missing: a absent key surfaced as a per-email failure loop
  // instead of one clear configuration error.
  if (!process.env.RESEND_API_KEY) {
    console.error('send-pitches: RESEND_API_KEY is not set');
    return res.status(500).json({ error: "RESEND_API_KEY is not configured" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const results = [];

  for (const pitch of pitches) {
    const label = (pitch && pitch.name) || (pitch && pitch.email) || 'unknown';

    // Validate before calling Resend so a malformed row cannot abort the batch
    // and an empty body can never reach a real investor.
    if (!isValidEmail(pitch && pitch.email)) {
      console.error('send-pitches: skipping ' + label + ' — invalid or missing email');
      results.push({ name: label, email: (pitch && pitch.email) || null, success: false, error: 'Invalid or missing email address' });
      continue;
    }
    if (!pitch.subject || !pitch.body || String(pitch.body).trim().length < 20) {
      console.error('send-pitches: skipping ' + label + ' — empty or too-short pitch');
      results.push({ name: label, email: pitch.email, success: false, error: 'Pitch subject or body was empty' });
      continue;
    }

    try {
      const sent = await resend.emails.send({
        from: (senderName || SENDER_NAME) + " <" + SENDER_EMAIL + ">",
        to: [pitch.email],
        subject: pitch.subject,
        text: pitch.body,
      });

      // The Resend SDK reports API-level problems in `error` rather than throwing,
      // so a failed send previously counted as a success.
      if (sent && sent.error) {
        console.error('send-pitches: Resend rejected ' + pitch.email + ': ' +
          (sent.error.message || JSON.stringify(sent.error)));
        results.push({
          name: pitch.name, email: pitch.email, success: false,
          error: sent.error.message || 'Resend rejected the message'
        });
        continue;
      }

      results.push({
        name: pitch.name,
        email: pitch.email,
        success: true,
        id: sent && sent.data ? sent.data.id : undefined
      });

    } catch (err) {
      console.error('send-pitches: failed to send to ' + pitch.email + ': ' + err.message);
      results.push({ name: pitch.name, email: pitch.email, success: false, error: err.message });
    }
  }

  const sentCount = results.filter(r => r.success).length;
  console.log('send-pitches: ' + sentCount + '/' + results.length + ' delivered');

  return res.json({ results, sent: sentCount, total: results.length });
}
