import { supabaseAdmin } from '../../../lib/supabaseAdmin';

/**
 * Nightly sweep: move silent investors to No Response.
 *
 * Runs at 09:00 UTC daily (see vercel.json). An investor who was pitched more
 * than NO_RESPONSE_AFTER_DAYS ago and has never opened or replied is not a live
 * conversation, and leaving them in Pitch Sent is how a pipeline stops meaning
 * anything — the column fills with people who ghosted six weeks ago and the
 * founder loses the ability to see who is actually pending.
 *
 * Nothing is deleted and nothing is closed. No Response is a `dormant` stage:
 * it stays on the board, the follow-up queue still surfaces it, and a reply
 * arriving next month pulls the relationship straight back to Engaged via the
 * trigger in 0007.
 *
 * SETUP
 *   1. Generate a secret:  openssl rand -hex 32
 *   2. Vercel → Settings → Environment Variables → CRON_SECRET
 *   3. Redeploy. Vercel attaches `Authorization: Bearer $CRON_SECRET` to every
 *      cron invocation automatically once that variable exists.
 *
 * The endpoint is safe to call by hand for a manual sweep, and safe to call
 * twice — a relationship already in No Response is skipped by the stage guard.
 */

const NO_RESPONSE_AFTER_DAYS = 14;

// Vercel functions are capped at 60s. A founder with thousands of open threads
// gets swept across consecutive nights rather than timing out on all of them.
const MAX_PER_RUN = 400;

function unauthorized(res, reason) {
  console.error('cron/no-response: rejected — ' + reason);
  return res.status(401).json({ error: 'Unauthorized' });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Failing closed. An open endpoint that rewrites pipeline stages is worse
    // than a sweep that does not run.
    console.error('cron/no-response: CRON_SECRET is not set — refusing to run');
    return res.status(500).json({ error: 'CRON_SECRET is not configured' });
  }

  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return unauthorized(res, 'no bearer token');
  if (match[1].trim() !== secret) return unauthorized(res, 'token mismatch');

  const cutoff = new Date(Date.now() - NO_RESPONSE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const db = supabaseAdmin();

    // Everything currently sitting in a Pitch Sent stage, across all founders.
    // The join on stage_key is what makes this safe for a founder who renamed
    // or rebuilt their pipeline: no key, no sweep.
    const { data: candidates, error: candidateError } = await db
      .from('investor_relationships')
      .select('id, owner_id, investor_firm, stage:pipeline_stages!inner(stage_key)')
      .is('archived_at', null)
      .eq('status', 'active')
      .eq('pipeline_stages.stage_key', 'pitch_sent')
      .limit(MAX_PER_RUN);

    if (candidateError) {
      console.error('cron/no-response: candidate query failed: ' + candidateError.message);
      return res.status(500).json({ error: 'Could not load candidates' });
    }

    const rows = candidates || [];
    if (!rows.length) {
      console.log('cron/no-response: nothing in Pitch Sent');
      return res.status(200).json({
        ok: true, scanned: 0, moved: 0, skipped: 0, cutoff, thresholdDays: NO_RESPONSE_AFTER_DAYS,
      });
    }

    // One query for every candidate's mail rather than one per candidate: at
    // 400 relationships the per-row version is 400 round trips inside a 60s
    // budget, and it is the same rows either way.
    const { data: emails, error: emailError } = await db
      .from('sent_emails')
      .select('relationship_id, sent_at, opened_at, replied_at')
      .in('relationship_id', rows.map((r) => r.id));

    if (emailError) {
      console.error('cron/no-response: email query failed: ' + emailError.message);
      return res.status(500).json({ error: 'Could not load sent emails' });
    }

    // Per relationship: the newest send, and whether anything was ever engaged
    // with. A single open on any mail in the thread keeps them out of the sweep.
    const summary = new Map();
    for (const mail of emails || []) {
      const current = summary.get(mail.relationship_id) || { lastSentAt: null, engaged: false };
      if (!current.lastSentAt || mail.sent_at > current.lastSentAt) current.lastSentAt = mail.sent_at;
      if (mail.opened_at || mail.replied_at) current.engaged = true;
      summary.set(mail.relationship_id, current);
    }

    let moved = 0;
    let skipped = 0;
    const failures = [];

    for (const row of rows) {
      const info = summary.get(row.id);

      // Never emailed at all, or emailed recently, or they engaged. All three
      // are live conversations by this endpoint's definition.
      if (!info || !info.lastSentAt || info.engaged || info.lastSentAt > cutoff) {
        skipped += 1;
        continue;
      }

      // The stage move, the STAGE_CHANGED event and the stage-history row are
      // all one call: crm_advance_stage does the never-downgrade check in SQL,
      // and the 0005 triggers fire off the resulting UPDATE.
      const { data: didMove, error: moveError } = await db.rpc('crm_advance_stage', {
        rel_id: row.id,
        from_keys: ['pitch_sent'],
        to_key: 'no_response',
      });

      if (moveError) {
        console.error('cron/no-response: could not move ' + row.id + ': ' + moveError.message);
        failures.push(row.id);
        continue;
      }

      if (didMove) moved += 1;
      else skipped += 1;
    }

    console.log(
      'cron/no-response: scanned ' + rows.length + ', moved ' + moved +
      ', skipped ' + skipped + ', failed ' + failures.length
    );

    return res.status(200).json({
      ok: true,
      scanned: rows.length,
      moved,
      skipped,
      failed: failures.length,
      cutoff,
      thresholdDays: NO_RESPONSE_AFTER_DAYS,
      truncated: rows.length === MAX_PER_RUN,
    });
  } catch (err) {
    console.error('cron/no-response: unhandled error: ' +
      (err && err.message ? err.message : String(err)));
    return res.status(500).json({ error: 'Sweep failed' });
  }
}
