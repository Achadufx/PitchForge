import {
  withCrmAuth,
  throwOnDbError,
  requireString,
  optionalString,
  badRequest,
} from '@/lib/crm/server';
import { assertCan } from '@/lib/crm/permissions';
import type { CampaignStatus } from '@/types/crm';

const STATUSES: CampaignStatus[] = ['active', 'paused', 'closed'];

/**
 * GET  /api/crm/campaigns — list, newest first
 * POST /api/crm/campaigns — create
 *
 * owner_id is set from the authenticated session, never from the body. RLS
 * would reject a mismatched owner anyway; setting it here means the request
 * fails as a clear 400 instead of an opaque policy violation.
 */
export default withCrmAuth(['GET', 'POST'], async ({ db, plan, req, userId }) => {
  assertCan(plan, 'campaign_management');

  if (req.method === 'GET') {
    const { data, error } = await db
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    throwOnDbError(error, 'list campaigns');
    return { campaigns: data || [] };
  }

  const name = requireString(req.body, 'name');
  const status = (req.body?.status ?? 'active') as CampaignStatus;
  if (!STATUSES.includes(status)) badRequest('status must be active, paused or closed');

  const rawTarget = req.body?.target_amount;
  let targetAmount: number | null = null;
  if (rawTarget !== undefined && rawTarget !== null && rawTarget !== '') {
    const parsed = Number(rawTarget);
    if (!Number.isFinite(parsed) || parsed < 0) badRequest('target_amount must be a positive number');
    targetAmount = parsed;
  }

  const { data, error } = await db
    .from('campaigns')
    .insert({
      owner_id: userId,
      name,
      goal: optionalString(req.body, 'goal'),
      target_amount: targetAmount,
      currency: optionalString(req.body, 'currency') || 'USD',
      status,
      notes: optionalString(req.body, 'notes'),
      // A campaign that exists is a campaign that has started, unless the
      // founder is drafting a paused one for later.
      started_at: status === 'active' ? new Date().toISOString() : null,
    })
    .select()
    .single();
  throwOnDbError(error, 'create campaign');

  return { campaign: data };
});
