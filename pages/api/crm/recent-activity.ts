import { withCrmAuth } from '@/lib/crm/server';

/**
 * GET /api/crm/recent-activity — last 5 events + investor count
 *
 * Returns recent relationship_events with investor firms for the activity feed
 * in the account tab, plus a count of active investor_relationships for the
 * setup score calculation. Single round-trip for the entire account tab data.
 */
export default withCrmAuth(['GET'], async ({ db, userId }) => {
  const [eventsResult, countResult] = await Promise.all([
    db
      .from('relationship_events')
      .select(`
        id,
        event_type,
        summary,
        occurred_at,
        relationship:investor_relationships!inner(
          id,
          investor_firm
        )
      `)
      .eq('owner_id', userId)
      .order('occurred_at', { ascending: false })
      .limit(5),
    db
      .from('investor_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .is('archived_at', null),
  ]);

  if (eventsResult.error) {
    console.error('[crm] recent-activity fetch failed:', eventsResult.error.message);
  }

  return {
    events: (eventsResult.data || []).map((event: any) => ({
      id: event.id,
      eventType: event.event_type,
      summary: event.summary,
      occurredAt: event.occurred_at,
      investorFirm: event.relationship?.investor_firm || 'Unknown investor',
    })),
    investorCount: countResult.count || 0,
  };
});
