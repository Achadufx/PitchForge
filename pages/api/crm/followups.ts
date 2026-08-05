import { withCrmAuth, throwOnDbError } from '@/lib/crm/server';
import { assertCan } from '@/lib/crm/permissions';
import { followupBucket, wholeDaysSince, NO_RESPONSE_AFTER_DAYS } from '@/lib/crm/stats';
import type {
  FollowupBucket,
  FollowupCandidate,
  RelationshipCard,
  SentEmail,
  RelationshipEvent,
} from '@/types/crm';

/**
 * GET /api/crm/followups?campaign_id=...
 *
 * Everyone who is waiting on the founder, oldest silence first.
 *
 * The queue is "pitched, and nothing has come back" — the Pitch Sent and No
 * Response stages. Engaged is excluded on purpose: an investor mid-conversation
 * needs a reply, not a follow-up template, and putting them in the same list as
 * a cold thread is how a founder sends a nudge to someone who answered
 * yesterday.
 *
 * Day counts and buckets come from lib/crm/stats so they agree exactly with the
 * threshold the cron sweep uses. Two roundings of "days ago" is one investor
 * showing as 13 days in the UI and 14 to the job.
 */

const QUEUE_STAGE_KEYS = ['pitch_sent', 'no_response'];

export default withCrmAuth(['GET'], async ({ db, plan, req }) => {
  assertCan(plan, 'crm_pipeline');

  const campaignId = typeof req.query.campaign_id === 'string' ? req.query.campaign_id : null;
  const now = Date.now();

  // `!inner` makes the stage join a filter rather than a decoration, so the
  // stage_key predicate below actually restricts the rows.
  let query = db
    .from('investor_relationships')
    .select('*, stage:pipeline_stages!inner(*), campaign:campaigns(id,name,status)')
    .is('archived_at', null)
    .eq('status', 'active')
    .in('pipeline_stages.stage_key', QUEUE_STAGE_KEYS)
    .limit(300);

  if (campaignId) query = query.eq('campaign_id', campaignId);

  const { data: relationshipRows, error } = await query;
  throwOnDbError(error, 'load follow-up candidates');

  const relationships = (relationshipRows || []) as RelationshipCard[];
  if (!relationships.length) {
    return {
      candidates: [],
      counts: { today: 0, three_to_seven: 0, seven_to_fourteen: 0, over_fourteen: 0 },
      total: 0,
      noResponseAfterDays: NO_RESPONSE_AFTER_DAYS,
    };
  }

  const ids = relationships.map((rel) => rel.id);

  // Two batched queries instead of two per investor. Both run under the
  // caller's RLS, so `owner_id` scoping is enforced by the database rather than
  // by this handler remembering to add a filter.
  const [emails, events] = await Promise.all([
    db
      .from('sent_emails')
      .select('relationship_id, subject, email_type, sent_at, opened_at, replied_at')
      .in('relationship_id', ids)
      .order('sent_at', { ascending: false }),
    db
      .from('relationship_events')
      .select('relationship_id, event_type, summary, occurred_at')
      .in('relationship_id', ids)
      .order('occurred_at', { ascending: false })
      .limit(1000),
  ]);

  throwOnDbError(emails.error, 'load follow-up emails');
  throwOnDbError(events.error, 'load follow-up activity');

  type MailRow = Pick<SentEmail, 'relationship_id' | 'subject' | 'email_type' | 'sent_at' | 'opened_at' | 'replied_at'>;
  type EventRow = Pick<RelationshipEvent, 'relationship_id' | 'event_type' | 'summary' | 'occurred_at'>;

  interface Accumulator {
    lastEmailAt: string | null;
    lastEmailSubject: string | null;
    followupCount: number;
    opened: boolean;
    replied: boolean;
  }

  const mail = new Map<string, Accumulator>();
  // Rows arrive newest-first, so the first sighting of a relationship is its
  // most recent send and no comparison is needed.
  for (const row of (emails.data || []) as MailRow[]) {
    const acc =
      mail.get(row.relationship_id) ||
      { lastEmailAt: null, lastEmailSubject: null, followupCount: 0, opened: false, replied: false };

    if (!acc.lastEmailAt) {
      acc.lastEmailAt = row.sent_at;
      acc.lastEmailSubject = row.subject;
    }
    if (row.email_type === 'followup' || row.email_type === 'sequence_step') acc.followupCount += 1;
    if (row.opened_at) acc.opened = true;
    if (row.replied_at) acc.replied = true;

    mail.set(row.relationship_id, acc);
  }

  const activity = new Map<string, EventRow>();
  for (const row of (events.data || []) as EventRow[]) {
    if (!activity.has(row.relationship_id)) activity.set(row.relationship_id, row);
  }

  const candidates: FollowupCandidate[] = relationships.map((relationship) => {
    const acc = mail.get(relationship.id);
    const latest = activity.get(relationship.id);
    const lastEmailAt = acc?.lastEmailAt ?? null;

    return {
      relationship,
      lastEmailAt,
      lastEmailSubject: acc?.lastEmailSubject ?? null,
      lastActivityAt: latest?.occurred_at ?? relationship.last_interaction_at ?? null,
      lastActivitySummary: latest?.summary ?? null,
      daysSincePitch: wholeDaysSince(lastEmailAt, now),
      followupCount: acc?.followupCount ?? 0,
      opened: acc?.opened ?? false,
      replied: acc?.replied ?? false,
    };
  });

  // Longest silence first. A never-pitched investor sorts last: they are in the
  // queue for completeness, not because they are overdue.
  candidates.sort((a, b) => (b.daysSincePitch ?? -1) - (a.daysSincePitch ?? -1));

  const counts: Record<FollowupBucket, number> = {
    today: 0,
    three_to_seven: 0,
    seven_to_fourteen: 0,
    over_fourteen: 0,
  };
  for (const candidate of candidates) counts[followupBucket(candidate.daysSincePitch)] += 1;

  return {
    candidates,
    counts,
    total: candidates.length,
    noResponseAfterDays: NO_RESPONSE_AFTER_DAYS,
  };
});
