import { withCrmAuth, CrmError } from '../../../lib/crm/server';
import { assertCan } from '../../../lib/crm/permissions';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { syncConnection, markNeedsReconnect, GmailAuthError, gmailConfigured } from '../../../lib/gmail';

/**
 * Manual sync — the "Sync Now" button on the Account tab.
 *
 * The cron does this every thirty minutes; this route exists because a founder
 * who just watched an investor reply does not want to wait thirty minutes to see
 * it in their pipeline.
 *
 * OWNERSHIP
 * The connection is fetched by `owner_id = ctx.userId`, where ctx.userId comes
 * from the token withCrmAuth already validated against Supabase. There is no
 * path where a connection id from the request selects the row — the request
 * carries no id at all, which is the simplest way to guarantee a founder can
 * only ever sync their own mailbox.
 *
 * WHAT IT WRITES
 * `sent_emails.replied_at`, and nothing else. The REPLIED timeline event and the
 * move to Engaged are both produced by triggers on that UPDATE (0005 and 0007
 * respectively), so a reply detected here and a reply reported by a webhook
 * produce byte-identical history. See lib/gmail.js for the longer version.
 */
export default withCrmAuth(['POST'], async (ctx) => {
  assertCan(ctx.plan, 'crm_pipeline');

  if (!gmailConfigured()) {
    throw new CrmError(503, 'Gmail is not configured on this deployment');
  }

  const db = supabaseAdmin();

  const { data: connection, error } = await db
    .from('gmail_connections')
    .select('id, owner_id, email, access_token, refresh_token, token_expiry, last_synced_at')
    .eq('owner_id', ctx.userId)
    .maybeSingle();

  if (error) {
    console.error('gmail/sync: lookup failed: ' + error.message);
    throw new CrmError(500, 'Could not load your Gmail connection');
  }
  if (!connection) {
    throw new CrmError(400, 'Connect your Gmail first');
  }

  // Belt and braces on top of the owner_id filter. If this ever fails, the query
  // above changed shape and the failure should be loud rather than a mailbox
  // read on behalf of the wrong founder.
  if (connection.owner_id !== ctx.userId) {
    console.error('gmail/sync: ownership mismatch on ' + connection.id);
    throw new CrmError(403, 'Not your connection');
  }

  try {
    // `full` re-scans the first-sync window instead of the incremental one, so a
    // founder who connected after their replies arrived can pull them in.
    const full = Boolean(ctx.req.body && ctx.req.body.full);
    const result = await syncConnection(db, connection, { full });

    console.log(
      'gmail/sync: ' + connection.email + ' checked ' + result.checked +
      ', matched ' + result.matched + ', updated ' + result.updated
    );

    // Counts and the addresses that replied — all of it already visible to this
    // founder in their own pipeline. No token field exists on this object to
    // forget to remove.
    return {
      ok: true,
      email: connection.email,
      checked: result.checked,
      repliesFound: result.updated,
      alreadyKnown: Math.max(0, result.matched - result.updated),
      replies: result.replies,
      truncated: result.truncated,
      syncedAt: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof GmailAuthError) {
      await markNeedsReconnect(db, connection.id, err.message);
      throw new CrmError(409, 'Gmail access expired — reconnect your account');
    }
    console.error('gmail/sync: failed for ' + connection.email + ': ' +
      (err && err.message ? err.message : String(err)));
    throw new CrmError(502, 'Could not reach Gmail. Try again in a minute.');
  }
});
