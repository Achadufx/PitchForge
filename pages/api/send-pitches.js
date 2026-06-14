import { Resend } from "resend";

const SENDER_EMAIL = process.env.SENDER_EMAIL || "pitchblast@onresend.com";
const SENDER_NAME = process.env.SENDER_NAME || "PitchBlast";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pitches, senderName } = req.body;

  if (!pitches || !Array.isArray(pitches) || pitches.length === 0) {
    return res.status(400).json({ error: "No pitches provided" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const results = [];

  for (const pitch of pitches) {
    try {
      await resend.emails.send({
        from: `${senderName || SENDER_NAME} <${SENDER_EMAIL}>`,
        to: [pitch.email],
        subject: pitch.subject,
        text: pitch.body,
      });
      results.push({ name: pitch.name, email: pitch.email, success: true });
    } catch (err) {
      console.error(`Failed to send to ${pitch.email}:`, err.message);
      results.push({ name: pitch.name, email: pitch.email, success: false, error: err.message });
    }
  }

  res.json({ results });
}
