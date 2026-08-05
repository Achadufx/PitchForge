import { withCrmAuth, throwOnDbError } from '@/lib/crm/server';
import { assertCan } from '@/lib/crm/permissions';
import { withRates, aggregateStats, isGoneQuiet, QUIET_AFTER_DAYS } from '@/lib/crm/stats';
import type { CampaignStatsRow, PipelineStage, RelationshipWithStage } from '@/types/crm';

/**
 * GET /api/crm/dashboard?campaign_id=...
 *
 * The founder's morning screen. One request, because a dashboard that arrives in
 * six pieces reads as slow even when the total time is identical.
 *
 * `campaign_id` scopes the funnel to one raise; without it the numbers are the
 * all-time totals across every campaign.
 */
export default withCrmAuth(['GET'], async ({ db, plan, req }) => {
  assertCan(plan, 'crm_pipeline');

  const campaignId = typeof req.query.campaign_id === 'string' ? req.query.campaign_id : null;
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const relationshipsQuery = db
    .from('investor_relationships')
    .select('*, stage:pipeline_stages(*)')
    .is('archived_at', null)
    .eq('status', 'active');

  const [stats, stages, relationships, overdue, upcoming, meetings, recent] = await Promise.all([
    db.from('campaign_stats').select('*'),
    db.from('pipeline_stages').select('*').order('position', { ascending: true }),
    campaignId ? relationshipsQuery.eq('campaign_id', campaignId) : relationshipsQuery,
    db
      .from('tasks')
      .select('*, relationship:investor_relationships(id,investor_firm)')
      .eq('status', 'pending')
      .lt('due_at', now.toISOString())
      .order('due_at', { ascending: true })
      .limit(50),
    db
      .from('tasks')
      .select('*, relationship:investor_relationships(id,investor_firm)')
      .eq('status', 'pending')
      .gte('due_at', now.toISOString())
      .lte('due_at', soon)
      .order('due_at', { ascending: true })
      .limit(50),
    db
      .from('relationship_meetings')
      .select('*, relationship:investor_relationships(id,investor_firm)')
      .is('completed_at', null)
      .gte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20),
    db
      .from('relationship_events')
      .select('*, relationship:investor_relationships(id,investor_firm)')
      .order('occurred_at', { ascending: false })
      .limit(40),
  ]);

  throwOnDbError(stats.error, 'load stats');
  throwOnDbError(stages.error, 'load stages');
  throwOnDbError(relationships.error, 'load relationships');
  throwOnDbError(overdue.error, 'load overdue tasks');
  throwOnDbError(upcoming.error, 'load upcoming tasks');
  throwOnDbError(meetings.error, 'load meetings');
  throwOnDbError(recent.error, 'load recent activity');

  const statRows = (stats.data || []) as CampaignStatsRow[];
  const scopedStats = campaignId
    ? statRows.filter((row) => row.campaign_id === campaignId).map(withRates)[0] || null
    : aggregateStats(statRows);

  const stageList = (stages.data || []) as PipelineStage[];
  const rels = (relationships.data || []) as RelationshipWithStage[];

  // Counted here rather than in SQL because the same relationship list is
  // already loaded for the quiet check — a second aggregate query would ask
  // Postgres a question we can already answer.
  const counts = new Map<string, number>();
  for (const rel of rels) counts.set(rel.stage_id, (counts.get(rel.stage_id) || 0) + 1);

  return {
    stats: scopedStats,
    stageCounts: stageList.map((stage) => ({ stage, count: counts.get(stage.id) || 0 })),
    overdueTasks: overdue.data || [],
    upcomingTasks: upcoming.data || [],
    upcomingMeetings: meetings.data || [],
    recentEvents: recent.data || [],
    goneQuiet: rels
      .filter((rel) => isGoneQuiet(rel, now))
      .sort((a, b) => (a.last_interaction_at || '') < (b.last_interaction_at || '') ? -1 : 1)
      .slice(0, 20),
    quietAfterDays: QUIET_AFTER_DAYS,
    totalActive: rels.length,
  };
});
