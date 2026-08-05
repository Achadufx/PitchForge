import { Resend } from "resend";
import { optionalCrmContext, recordEmailsSent } from "../../lib/crm/ingest";

const SENDER_EMAIL = process.env.SENDER_EMAIL || "pitchblast@onresend.com";
const SENDER_NAME = process.env.SENDER_NAME || "PitchBlast";

// Mirrors the crm_email_type enum. An unrecognised value from the client falls
// back to 'initial_pitch' rather than reaching Postgres and failing the insert
// after the mail has already gone out.
const VALID_EMAIL_TYPES = ['initial_pitch', 'followup', 'sequence_step', 'manual'];

function isValidEmail(value) {
  if (!value || typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pitches, senderName, campaignId } = req.body || {};

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
  // Only what actually left the building, kept alongside the investor details
  // the CRM needs. A failed send is not a timeline event.
  const delivered = [];

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

      delivered.push({
        firm: pitch.firm || pitch.name || 'Unknown Investor',
        contact: pitch.name || null,
        email: pitch.email,
        subject: pitch.subject,
        body: String(pitch.body),
        providerMessageId: sent && sent.data ? sent.data.id : null,
        // The CRM follow-up queue sends through this same route and needs the
        // send filed as a follow-up, not a first touch: the trigger in 0005
        // maps email_type onto FOLLOWUP_SENT vs EMAIL_SENT, and the wrong one
        // makes a third nudge count as a third investor reached.
        emailType: VALID_EMAIL_TYPES.indexOf(pitch.emailType) !== -1
          ? pitch.emailType
          : 'initial_pitch',
        // Sent straight through when the caller already knows the pipeline row,
        // which skips the firm/email lookup and removes any chance of the
        // follow-up landing on a different relationship than the original.
        relationshipId: pitch.relationshipId || null,
      });

    } catch (err) {
      console.error('send-pitches: failed to send to ' + pitch.email + ': ' + err.message);
      results.push({ name: pitch.name, email: pitch.email, success: false, error: err.message });
    }
  }

  const sentCount = results.filter(r => r.success).length;
  console.log('send-pitches: ' + sentCount + '/' + results.length + ' delivered');

  // Mirror the delivered sends into the CRM. This runs after every send has
  // been attempted and its outcome recorded, and it is wrapped because the
  // emails have already gone out: a CRM write that throws here must not turn a
  // successful send into a 500 the founder reads as "it didn't send".
  //
  // Silent when the caller has no session or no CRM on their plan, which is why
  // the pitch flow keeps working unchanged for everyone else.
  let crm = null;
  try {
    const ctx = await optionalCrmContext(req);
    if (ctx && delivered.length) {
      crm = await recordEmailsSent(ctx, delivered, campaignId || null);
      console.log('send-pitches: CRM recorded ' + crm.recorded + '/' + delivered.length);
    }
  } catch (err) {
    console.error('send-pitches: CRM recording failed: ' + (err && err.message ? err.message : String(err)));
  }

  return res.json({ results, sent: sentCount, total: results.length, crm });
}
