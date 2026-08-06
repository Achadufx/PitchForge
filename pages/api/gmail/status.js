import { withCrmAuth } from '../../../lib/crm/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { publicConnection, gmailConfigured } from '../../../lib/gmail';
import { can } from '../../../lib/crm/permissions';

/**
 * Connection status for the Account tab.
 *
 * Deliberately not gated on plan: a founder who downgrades still needs to see
 * that PitchWire holds a grant on their mailbox, and be able to take it back.
 * Hiding the row would leave a live token they cannot reach from here.
 *
 * The response goes through publicConnection(), which builds its output by
 * picking fields rather than deleting them — so no future column can leak by
 * being forgotten.
 */
export default withCrmAuth(['GET'], async (ctx) => {
  const db = supabaseAdmin();

  const { data, error } = await db
    .from('gmail_connections')
    .select('id, email, last_synced_at, created_at, sync_error')
    .eq('owner_id', ctx.userId)
    .maybeSingle();

  if (error) {
    console.error('gmail/status: lookup failed: ' + error.message);
    throw new Error(error.message);
  }

  return {
    available: gmailConfigured(),
    // Connecting is what makes sending work, so it follows the send gate.
    // `syncEligible` is the narrower question — whether reply detection will
    // actually run — and stays on the pipeline gate.
    eligible: can(ctx.plan, 'email_sending'),
    syncEligible: can(ctx.plan, 'crm_pipeline'),
    connection: data ? publicConnection(data) : { connected: false },
  };
});
