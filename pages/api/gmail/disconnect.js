import { withCrmAuth } from '../../../lib/crm/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { decryptToken } from '../../../lib/gmail';

/**
 * Removes the founder's Gmail connection.
 *
 * Two things happen, in this order: the grant is revoked at Google, then the row
 * is deleted. Deleting first would leave a live token on Google's side with no
 * record of it here — the founder would see "Not connected" while PitchWire
 * still technically held a key to their mailbox. Revoking first means the worst
 * case is a dead token in a row we can delete again.
 *
 * The revoke is best-effort. If Google is unreachable the row still goes, since
 * a founder pressing Disconnect must always end up disconnected; the token they
 * are left holding is one they can also kill from their Google account page.
 */
export default withCrmAuth(['POST', 'DELETE'], async (ctx) => {
  const db = supabaseAdmin();

  // Scoped by owner_id, so this can only ever reach the caller's own row even
  // though the client bypasses RLS. The user id comes from the validated token
  // in withCrmAuth, never from the request.
  const { data: row, error } = await db
    .from('gmail_connections')
    .select('id, email, refresh_token')
    .eq('owner_id', ctx.userId)
    .maybeSingle();

  if (error) {
    console.error('gmail/disconnect: lookup failed: ' + error.message);
    return { ok: true, connected: false };
  }

  // Already gone. Idempotent rather than a 404: the founder asked to be
  // disconnected and they are.
  if (!row) return { ok: true, connected: false };

  try {
    const token = decryptToken(row.refresh_token);
    if (token) {
      const res = await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }).toString(),
      });
      // 400 here usually means the token was already invalid, which is the
      // outcome we wanted anyway.
      if (!res.ok && res.status !== 400) {
        console.error('gmail/disconnect: Google revoke returned ' + res.status);
      }
    }
  } catch (err) {
    console.error('gmail/disconnect: revoke failed: ' +
      (err && err.message ? err.message : String(err)));
  }

  const { error: deleteError } = await db
    .from('gmail_connections')
    .delete()
    .eq('id', row.id)
    .eq('owner_id', ctx.userId);

  if (deleteError) {
    console.error('gmail/disconnect: delete failed: ' + deleteError.message);
    // The token is revoked at this point, so reporting success would be a lie
    // about the state of the row the UI is about to re-read.
    return ctx.res.status(500).json({ error: 'Could not remove the connection' });
  }

  console.log('gmail/disconnect: removed ' + row.email + ' for ' + ctx.userId);
  return { ok: true, connected: false };
});
