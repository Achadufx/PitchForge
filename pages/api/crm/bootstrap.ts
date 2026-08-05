import { withCrmAuth, throwOnDbError } from '@/lib/crm/server';
import { assertCan } from '@/lib/crm/permissions';
import { withRates, aggregateStats } from '@/lib/crm/stats';
import type { PipelineStage, Campaign, CampaignStatsRow } from '@/types/crm';

/**
 * GET /api/crm/bootstrap
 *
 * One round trip for everything the CRM needs before it can render anything:
 * the pipeline stages, the campaigns, and their stats. The alternative is three
 * sequential requests with two loading spinners stacked on each other, which is
 * exactly the feel we are trying to avoid.
 *
 * Also the place stages get seeded. Doing it here rather than on signup means
 * founders who registered before the CRM existed get their pipeline the first
 * time they open the tab, with no backfill migration.
 */
export default withCrmAuth(['GET'], async ({ db, plan }) => {
  assertCan(plan, 'crm_pipeline');

  // Idempotent: seeds only if the founder has no stages at all, so a renamed or
  // deleted stage is never resurrected underneath them.
  const { data: stages, error: stagesError } = await db.rpc('crm_ensure_default_stages');
  throwOnDbError(stagesError, 'crm_ensure_default_stages');

  const { data: campaigns, error: campaignsError } = await db
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });
  throwOnDbError(campaignsError, 'load campaigns');

  const { data: statsRows, error: statsError } = await db.from('campaign_stats').select('*');
  throwOnDbError(statsError, 'load campaign stats');

  const rows = (statsRows || []) as CampaignStatsRow[];

  return {
    stages: ((stages || []) as PipelineStage[]).sort((a, b) => a.position - b.position),
    campaigns: (campaigns || []) as Campaign[],
    stats: rows.map(withRates),
    totals: aggregateStats(rows),
  };
});
