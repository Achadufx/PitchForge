import crypto from 'crypto';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

/**
 * Resend delivery webhook.
 *
 * SCOPE AS OF THE GMAIL MIGRATION
 * Pitches no longer go out through Resend — they are sent from the founder's own
 * mailbox by /api/send-pitches, and their `provider_message_id` is an RFC 2822
 * Message-ID rather than a Resend email_id. So this endpoint will stop matching
 * rows for pitch sends, and the lookup below falls through to its existing
 * `matched: false` branch, which is the correct outcome rather than an error.
 *
 * It stays wired up for transactional mail that still goes through Resend, and
 * for pitch rows written before the migration. Note that `opened_at` has no
 * equivalent under Gmail: the API reports nothing about opens, so open tracking
 * only exists for those older rows.
 *
 * Replies are now detected by lib/gmail.js, which matches In-Reply-To and
 * References against the stored Message-ID. That is a real signal, unlike the
 * `email.replied` branch here, which Resend does not emit for ordinary outbound.
 *
 * This handler is deliberately thin. It writes two timestamp columns; the
 * triggers in 0005 and 0007 turn those writes into timeline events and stage
 * moves, so a replayed webhook and a manual `UPDATE` produce identical history.
 *
 * SETUP
 *   1. Resend dashboard → Webhooks → Add Endpoint
 *   2. URL: https://pitchwire.vercel.app/api/resend-webhook
 *   3. Subscribe to: email.sent, email.delivered, email.opened, email.clicked,
 *      email.bounced, email.complained
 *   4. Copy the signing secret (starts with `whsec_`) into RESEND_WEBHOOK_SECRET
 *      in Vercel → Settings → Environment Variables, then redeploy.
 */

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Verifies a Svix signature, which is the scheme Resend uses.
 *
 * Implemented here rather than pulling in the `svix` package: it is thirty
 * lines of HMAC and one dependency fewer in a serverless bundle.
 *
 * The signed payload is `${id}.${timestamp}.${body}` and the secret is base64
 * after its `whsec_` prefix. The header can carry several space-separated
 * versioned signatures during a secret rotation, so every v1 entry is checked.
 */
function verifySignature(rawBody, headers, secret) {
  const id = headers['svix-id'] || headers['webhook-id'];
  const timestamp = headers['svix-timestamp'] || headers['webhook-timestamp'];
  const signature = headers['svix-signature'] || headers['webhook-signature'];

  if (!id || !timestamp || !signature) {
    return { ok: false, reason: 'missing svix-id, svix-timestamp or svix-signature header' };
  }

  // A replayed request with a valid old signature is still a replay. Rejecting
  // anything outside five minutes is what makes the signature a proof of
  // freshness and not just of origin.
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'timestamp outside tolerance' };
  }

  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody.toString('utf8')}`)
    .digest('base64');

  const expectedBuf = Buffer.from(expected);
  const provided = String(signature).split(' ');

  for (const entry of provided) {
    const [version, value] = entry.split(',');
    if (version !== 'v1' || !value) continue;
    const candidate = Buffer.from(value);
    // Length-check first: timingSafeEqual throws on a mismatch rather than
    // returning false, and a wrong-length signature is a failure, not a crash.
    if (candidate.length !== expectedBuf.length) continue;
    if (crypto.timingSafeEqual(candidate, expectedBuf)) return { ok: true };
  }

  return { ok: false, reason: 'no matching v1 signature' };
}

/** Maps a Resend event type onto the column it stamps. */
function columnFor(eventType) {
  switch (eventType) {
    case 'email.opened':
      return 'opened_at';
    case 'email.replied':
    case 'email.reply':
      return 'replied_at';
    default:
      return null;
  }
}

/** Delivery-state events update `delivery_status` instead of an engagement column. */
const DELIVERY_STATUS = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Refusing unsigned traffic is the point. An unverified endpoint that
    // writes to sent_emails lets anyone mark any founder's pitch as replied to.
    console.error('resend-webhook: RESEND_WEBHOOK_SECRET is not set — rejecting');
    return res.status(500).json({ error: 'Webhook secret is not configured' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    console.error('resend-webhook: could not read body: ' + (err && err.message));
    return res.status(400).json({ error: 'Could not read request body' });
  }

  const verdict = verifySignature(rawBody, req.headers, secret);
  if (!verdict.ok) {
    console.error('resend-webhook: signature rejected — ' + verdict.reason);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    console.error('resend-webhook: body was not JSON: ' + (err && err.message));
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const type = event && event.type;
  const data = (event && event.data) || {};
  const messageId = data.email_id || data.id || null;

  if (!type || !messageId) {
    // 200 rather than 400: Resend retries non-2xx, and retrying a payload we
    // will never understand just fills the log.
    console.warn('resend-webhook: ignoring event with no type or email_id');
    return res.status(200).json({ ok: true, ignored: true });
  }

  try {
    const db = supabaseAdmin();

    // Service role bypasses RLS, so the lookup is by provider_message_id alone —
    // that id came from Resend when we sent the mail, and it already identifies
    // exactly one row and therefore exactly one owner. No owner is inferred
    // from anything in the request body.
    const { data: rows, error: findError } = await db
      .from('sent_emails')
      .select('id, owner_id, relationship_id, opened_at, replied_at, delivery_status')
      .eq('provider_message_id', messageId)
      .limit(1);

    if (findError) {
      console.error('resend-webhook: lookup failed: ' + findError.message);
      return res.status(500).json({ error: 'Lookup failed' });
    }

    if (!rows || !rows.length) {
      // Mail sent before the CRM existed, or from another product on the same
      // Resend account. Acknowledge so Resend stops retrying.
      console.log('resend-webhook: no sent_emails row for message ' + messageId);
      return res.status(200).json({ ok: true, matched: false });
    }

    const row = rows[0];
    const occurredAt = event.created_at || data.created_at || new Date().toISOString();
    const patch = {};

    const engagementColumn = columnFor(type);
    if (engagementColumn) {
      // First touch wins. Resend re-fires opens for every image load, and
      // overwriting would make "opened 3 weeks ago" read as "opened just now"
      // every time the investor scrolled past the thread.
      if (!row[engagementColumn]) patch[engagementColumn] = occurredAt;
    } else if (DELIVERY_STATUS[type]) {
      patch.delivery_status = DELIVERY_STATUS[type];
      if (type === 'email.bounced' || type === 'email.complained') {
        patch.error_message = data.reason || data.message || type;
      }
    } else {
      console.log('resend-webhook: no handler for ' + type + ' — acknowledged');
      return res.status(200).json({ ok: true, handled: false, type });
    }

    if (!Object.keys(patch).length) {
      return res.status(200).json({ ok: true, alreadyRecorded: true, type });
    }

    const { error: updateError } = await db
      .from('sent_emails')
      .update(patch)
      .eq('id', row.id);

    if (updateError) {
      console.error('resend-webhook: update failed: ' + updateError.message);
      return res.status(500).json({ error: 'Update failed' });
    }

    // EMAIL_OPENED / REPLIED events and the Pitch Sent → Engaged move are both
    // written by triggers on this UPDATE. Nothing else to do here.
    console.log('resend-webhook: ' + type + ' recorded for sent_email ' + row.id);
    return res.status(200).json({ ok: true, handled: true, type });
  } catch (err) {
    console.error('resend-webhook: unhandled error: ' + (err && err.message ? err.message : String(err)));
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
