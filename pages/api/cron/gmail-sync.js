import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { syncConnection, markNeedsReconnect, GmailAuthError, gmailConfigured } from '../../../lib/gmail';

/**
 * Every thirty minutes: check each connected mailbox for investor replies.
 *
 * This is what makes the integration feel automatic. A founder connects Gmail
 * once and their reply rate stays true without them ever pressing anything —
 * which is the whole promise, since the one thing a founder mid-raise will not
 * do is maintain a CRM by hand.
 *
 * Writes exactly one column, `sent_emails.replied_at`. The REPLIED event and the
 * stage move to Engaged come from the triggers in 0005 and 0007 firing on that
 * UPDATE, so this cron and the manual button and a future webhook all produce
 * identical history. See lib/gmail.js.
 *
 * SETUP
 *   1. CRON_SECRET in Vercel (shared with /api/cron/no-response).
 *   2. Redeploy. Vercel attaches `Authorization: Bearer $CRON_SECRET`
 *      automatically once the variable exists.
 *
 * Safe to run by hand and safe to run twice: replied_at is only written when it
 * is currently NULL, so a second pass over the same reply changes nothing.
 */

// Sixty seconds is the function ceiling and each mailbox costs a handful of
// Gmail round trips. Connections are taken oldest-synced-first, so a founder
// skipped in one run is at the front of the queue for the next.
const MAX_CONNECTIONS_PER_RUN = 25;

// Leave headroom before the platform kills the function mid-mailbox.
const TIME_BUDGET_MS = 50 * 1000;

function unauthorized(res, reason) {
  console.error('cron/gmail-sync: rejected — ' + reason);
  return res.status(401).json({ error: 'Unauthorized' });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail closed. An open endpoint that reads mailboxes is worse than a sync
    // that does not run.
    console.error('cron/gmail-sync: CRON_SECRET is not set — refusing to run');
    return res.status(500).json({ error: 'CRON_SECRET is not configured' });
  }

  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return unauthorized(res, 'no bearer token');
  if (match[1].trim() !== secret) return unauthorized(res, 'token mismatch');

  if (!gmailConfigured()) {
    console.error('cron/gmail-sync: Google OAuth env vars are not set');
    return res.status(500).json({ error: 'Gmail is not configured' });
  }

  const startedAt = Date.now();

  try {
    const db = supabaseAdmin();

    // Skip connections already flagged as revoked: retrying a dead grant every
    // thirty minutes burns the budget of founders whose grants still work, and
    // the Account tab is already telling that founder to reconnect.
    const { data: connections, error } = await db
      .from('gmail_connections')
      .select('id, owner_id, email, access_token, refresh_token, token_expiry, last_synced_at')
      .is('sync_error', null)
      .order('last_synced_at', { ascending: true, nullsFirst: true })
      .limit(MAX_CONNECTIONS_PER_RUN);

    if (error) {
      console.error('cron/gmail-sync: connection query failed: ' + error.message);
      return res.status(500).json({ error: 'Could not load connections' });
    }

    const rows = connections || [];
    if (!rows.length) {
      console.log('cron/gmail-sync: no connected mailboxes');
      return res.status(200).json({ ok: true, mailboxes: 0, repliesFound: 0 });
    }

    let repliesFound = 0;
    let checked = 0;
    let failed = 0;
    let needsReconnect = 0;
    let stoppedEarly = false;

    for (const connection of rows) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        stoppedEarly = true;
        break;
      }

      try {
        const result = await syncConnection(db, connection, {});
        checked += 1;
        repliesFound += result.updated;

        if (result.updated) {
          console.log('cron/gmail-sync: ' + connection.email + ' — ' + result.updated + ' new repl' +
            (result.updated === 1 ? 'y' : 'ies'));
        }
      } catch (err) {
        // One founder's revoked grant or rate limit must not abort the sweep for
        // everyone behind them in the queue.
        if (err instanceof GmailAuthError) {
          await markNeedsReconnect(db, connection.id, err.message);
          needsReconnect += 1;
          console.error('cron/gmail-sync: ' + connection.email + ' needs reconnect: ' + err.message);
        } else {
          failed += 1;
          console.error('cron/gmail-sync: ' + connection.email + ' failed: ' +
            (err && err.message ? err.message : String(err)));
        }
      }
    }

    console.log(
      'cron/gmail-sync: swept ' + checked + '/' + rows.length + ' mailboxes, ' +
      repliesFound + ' replies, ' + needsReconnect + ' need reconnect, ' + failed + ' failed'
    );

    return res.status(200).json({
      ok: true,
      mailboxes: rows.length,
      synced: checked,
      repliesFound,
      needsReconnect,
      failed,
      stoppedEarly,
      truncated: rows.length === MAX_CONNECTIONS_PER_RUN,
      ms: Date.now() - startedAt,
    });
  } catch (err) {
    console.error('cron/gmail-sync: unhandled error: ' +
      (err && err.message ? err.message : String(err)));
    return res.status(500).json({ error: 'Sync failed' });
  }
}
