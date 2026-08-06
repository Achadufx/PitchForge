import { authContext, recordEmailsSent } from "../../lib/crm/ingest";
import { can } from "../../lib/crm/permissions";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import {
  ensureAccessToken,
  sendGmailMessage,
  GmailAuthError,
  GmailRateLimitError,
  gmailConfigured,
} from "../../lib/gmail";

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

  if (!gmailConfigured()) {
    console.error('send-pitches: Gmail is not configured');
    return res.status(500).json({ error: "Gmail is not configured on this deployment" });
  }

  // Sending needs a user id to find the founder's mailbox, so the session is no
  // longer optional the way it was under Resend. authContext deliberately does
  // not gate on plan — sending is a free feature and only the CRM recording
  // below is Starter-and-up.
  let ctx;
  try {
    ctx = await authContext(req);
  } catch (err) {
    console.error('send-pitches: auth failed: ' + err.message);
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!ctx || !ctx.userId) {
    return res.status(401).json({ error: "Sign in to send pitches" });
  }

  const db = supabaseAdmin();

  const { data: connection, error: connError } = await db
    .from('gmail_connections')
    .select('id, owner_id, email, access_token, refresh_token, token_expiry')
    .eq('owner_id', ctx.userId)
    .maybeSingle();

  if (connError) {
    console.error('send-pitches: Gmail lookup failed: ' + connError.message);
    return res.status(500).json({ error: "Could not load your Gmail connection" });
  }

  if (!connection) {
    return res.status(400).json({
      error: "Please connect your Gmail in Account settings before sending pitches",
      needsGmailConnection: true
    });
  }

  // Belt and braces on top of the owner_id filter.
  if (connection.owner_id !== ctx.userId) {
    console.error('send-pitches: ownership mismatch on ' + connection.id);
    return res.status(403).json({ error: "Not your connection" });
  }

  let accessToken;
  try {
    accessToken = await ensureAccessToken(db, connection);
  } catch (err) {
    if (err instanceof GmailAuthError) {
      console.error('send-pitches: auth error: ' + err.message);
      return res.status(409).json({
        error: "Gmail access expired — reconnect your account in Settings",
        needsReconnect: true
      });
    }
    console.error('send-pitches: token refresh failed: ' + err.message);
    return res.status(502).json({ error: "Could not reach Gmail. Try again in a minute." });
  }

  const results = [];
  const delivered = [];

  for (let index = 0; index < pitches.length; index += 1) {
    const pitch = pitches[index];
    const label = (pitch && pitch.name) || (pitch && pitch.email) || 'unknown';

    // Validate before calling Gmail so a malformed row cannot abort the batch
    // and an empty body can never reach a real investor.
    if (!isValidEmail(pitch && pitch.email)) {
      console.error('send-pitches: skipping ' + label + ' — invalid or missing email');
      results.push({
        name: label,
        email: (pitch && pitch.email) || null,
        success: false,
        error: 'Invalid or missing email address'
      });
      continue;
    }
    if (!pitch.subject || !pitch.body || String(pitch.body).trim().length < 20) {
      console.error('send-pitches: skipping ' + label + ' — empty or too-short pitch');
      results.push({
        name: label,
        email: pitch.email,
        success: false,
        error: 'Pitch subject or body was empty'
      });
      continue;
    }

    try {
      const sent = await sendGmailMessage(accessToken, {
        fromName: senderName || connection.email.split('@')[0],
        fromEmail: connection.email,
        to: pitch.email,
        subject: pitch.subject,
        body: pitch.body,
      });

      results.push({
        name: pitch.name,
        email: pitch.email,
        success: true,
        id: sent.gmailId
      });

      delivered.push({
        firm: pitch.firm || pitch.name || 'Unknown Investor',
        contact: pitch.name || null,
        email: pitch.email,
        subject: pitch.subject,
        body: String(pitch.body),
        // Store RFC 2822 Message-ID for In-Reply-To/References matching
        providerMessageId: sent.messageId,
        providerThreadId: sent.threadId,
        emailType: VALID_EMAIL_TYPES.indexOf(pitch.emailType) !== -1
          ? pitch.emailType
          : 'initial_pitch',
        relationshipId: pitch.relationshipId || null,
      });

    } catch (err) {
      // Rate limit is the one error that means "stop the loop now and report
      // partial success", not "this pitch failed, move to the next one".
      if (err instanceof GmailRateLimitError) {
        console.error('send-pitches: rate limited after ' + results.length + '/' + pitches.length);
        results.push({
          name: pitch.name,
          email: pitch.email,
          success: false,
          error: 'Gmail rate limit — remaining pitches not sent'
        });
        // Mark every remaining pitch as skipped
        for (let i = index + 1; i < pitches.length; i++) {
          const skipped = pitches[i];
          results.push({
            name: skipped && skipped.name,
            email: (skipped && skipped.email) || null,
            success: false,
            error: 'Skipped due to rate limit'
          });
        }
        break;
      }

      if (err instanceof GmailAuthError) {
        console.error('send-pitches: auth failed mid-campaign: ' + err.message);
        return res.status(409).json({
          error: "Gmail access expired — reconnect your account",
          needsReconnect: true,
          partialResults: results,
          sent: results.filter(r => r.success).length,
          total: pitches.length
        });
      }

      console.error('send-pitches: failed to send to ' + pitch.email + ': ' + err.message);
      results.push({
        name: pitch.name,
        email: pitch.email,
        success: false,
        error: err.message || 'Send failed'
      });
    }
  }

  const sentCount = results.filter(r => r.success).length;
  console.log('send-pitches: ' + sentCount + '/' + results.length + ' delivered via Gmail');

  // Mirror the delivered sends into the CRM. This runs after every send has
  // been attempted and its outcome recorded, and it is wrapped because the
  // emails have already gone out: a CRM write that throws here must not turn a
  // successful send into a 500 the founder reads as "it didn't send".
  let crm = null;
  try {
    // Only Starter and up have a pipeline to record into. Free founders still
    // send; the send just doesn't land on a timeline, which is the same
    // behaviour they had before.
    if (delivered.length && can(ctx.plan, 'crm_pipeline')) {
      crm = await recordEmailsSent(ctx, delivered, campaignId || null);
      console.log('send-pitches: CRM recorded ' + crm.recorded + '/' + delivered.length);
    }
  } catch (err) {
    console.error('send-pitches: CRM recording failed: ' + (err && err.message ? err.message : String(err)));
  }

  return res.json({ results, sent: sentCount, total: results.length, crm });
}
