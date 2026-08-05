import { withCrmAuth, throwOnDbError, notFound, badRequest } from '@/lib/crm/server';
import { assertCan } from '@/lib/crm/permissions';
import { withRates } from '@/lib/crm/stats';
import type { CampaignStatsRow, CampaignStatus } from '@/types/crm';

const STATUSES: CampaignStatus[] = ['active', 'paused', 'closed'];

/**
 * GET    /api/crm/campaigns/:id  — campaign, its stats, and its relationships
 * PATCH  /api/crm/campaigns/:id  — rename, retarget, change status
 * DELETE /api/crm/campaigns/:id  — cascades to relationships and their history
 */
export default withCrmAuth(['GET', 'PATCH', 'DELETE'], async ({ db, plan, req }) => {
  assertCan(plan, 'campaign_management');

  const id = req.query.id;
  if (typeof id !== 'string') badRequest('campaign id is required');

  if (req.method === 'GET') {
    const { data: campaign, error } = await db
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnDbError(error, 'load campaign');
    if (!campaign) notFound('Campaign not found');

    const { data: statsRow, error: statsError } = await db
      .from('campaign_stats')
      .select('*')
      .eq('campaign_id', id)
      .maybeSingle();
    throwOnDbError(statsError, 'load campaign stats');

    // Relationships come back with their stage embedded so the board can render
    // without a second query and without the client joining by hand.
    const { data: relationships, error: relError } = await db
      .from('investor_relationships')
      .select('*, stage:pipeline_stages(*)')
      .eq('campaign_id', id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false });
    throwOnDbError(relError, 'load campaign relationships');

    return {
      campaign,
      stats: statsRow ? withRates(statsRow as CampaignStatsRow) : null,
      relationships: relationships || [],
    };
  }

  if (req.method === 'DELETE') {
    const { error } = await db.from('campaigns').delete().eq('id', id);
    throwOnDbError(error, 'delete campaign');
    return { ok: true };
  }

  // PATCH — build the update from known fields only, so a client cannot smuggle
  // owner_id or created_at into it.
  const body = (req.body || {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (typeof body.name === 'string') {
    if (!body.name.trim()) badRequest('name cannot be empty');
    patch.name = body.name.trim();
  }
  if ('goal' in body) patch.goal = typeof body.goal === 'string' ? body.goal.trim() || null : null;
  if ('notes' in body) patch.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
  if ('currency' in body && typeof body.currency === 'string') patch.currency = body.currency.trim();

  if ('target_amount' in body) {
    const raw = body.target_amount;
    if (raw === null || raw === '') {
      patch.target_amount = null;
    } else {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) badRequest('target_amount must be a positive number');
      patch.target_amount = parsed;
    }
  }

  if ('status' in body) {
    const status = body.status as CampaignStatus;
    if (!STATUSES.includes(status)) badRequest('status must be active, paused or closed');
    patch.status = status;
    // Closing stamps the date; reopening clears it, so "how long did the raise
    // take" stays answerable and never reports a stale close date.
    patch.closed_at = status === 'closed' ? new Date().toISOString() : null;
  }

  if (!Object.keys(patch).length) badRequest('Nothing to update');

  const { data, error } = await db
    .from('campaigns')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();
  throwOnDbError(error, 'update campaign');
  if (!data) notFound('Campaign not found');

  return { campaign: data };
});
