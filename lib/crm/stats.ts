import type { CampaignStats, CampaignStatsRow, FollowupBucket } from '@/types/crm';

/**
 * Derives the funnel rates from the raw `campaign_stats` aggregates.
 *
 * Deliberately not computed in Postgres: every rate needs a zero-denominator
 * guard, and the UI wants the raw counts anyway to render "12 of 40" beside the
 * percentage. Doing it here keeps one definition of each rate for the dashboard,
 * the campaign page, and any export.
 *
 * `investors_emailed` is the denominator throughout, not `total_investors` — a
 * founder who added 200 prospects and pitched 20 has a reply rate against the
 * 20 they actually contacted. Measuring against the 200 would make the number
 * meaningless and would drop every time they imported a list.
 */

function rate(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function withRates(row: CampaignStatsRow): CampaignStats {
  const contacted = row.investors_emailed;
  return {
    ...row,
    open_rate: rate(row.investors_opened, contacted),
    reply_rate: rate(row.investors_replied, contacted),
    meeting_rate: rate(row.investors_met, contacted),
    investment_rate: rate(row.investments, contacted),
  };
}

/** Sums several campaigns into one all-time view for the dashboard header. */
export function aggregateStats(rows: CampaignStatsRow[]): CampaignStats | null {
  if (!rows.length) return null;

  const first = rows[0];
  // Time-to-reply is a mean, so it cannot be summed. It is weighted by each
  // campaign's replier count as it goes, then divided out at the end —
  // averaging the averages would let a campaign with one reply outvote one
  // with fifty.
  let replyDayWeight = 0;
  let replyDaySum = 0;

  const total = rows.reduce<CampaignStatsRow>(
    (acc, row) => {
      if (row.avg_days_to_first_reply != null && row.investors_replied > 0) {
        replyDaySum += row.avg_days_to_first_reply * row.investors_replied;
        replyDayWeight += row.investors_replied;
      }
      return {
        ...acc,
        total_investors: acc.total_investors + row.total_investors,
        investments: acc.investments + row.investments,
        passes: acc.passes + row.passes,
        investors_emailed: acc.investors_emailed + row.investors_emailed,
        investors_replied: acc.investors_replied + row.investors_replied,
        investors_met: acc.investors_met + row.investors_met,
        investors_opened: acc.investors_opened + row.investors_opened,
        emails_sent: acc.emails_sent + row.emails_sent,
        pitches_generated: acc.pitches_generated + row.pitches_generated,
        last_activity_at:
          !acc.last_activity_at ||
          (row.last_activity_at && row.last_activity_at > acc.last_activity_at)
            ? row.last_activity_at
            : acc.last_activity_at,
      };
    },
    {
      ...first,
      campaign_id: 'all',
      name: 'All campaigns',
      total_investors: 0,
      investments: 0,
      passes: 0,
      investors_emailed: 0,
      investors_replied: 0,
      investors_met: 0,
      investors_opened: 0,
      avg_days_to_first_reply: null,
      emails_sent: 0,
      pitches_generated: 0,
      last_activity_at: null,
    }
  );

  total.avg_days_to_first_reply = replyDayWeight
    ? Math.round((replyDaySum / replyDayWeight) * 10) / 10
    : null;

  return withRates(total);
}

/**
 * A relationship is "gone quiet" when it is live, has been contacted, and
 * nothing has happened since the window closed. Contacted matters: a prospect
 * nobody has pitched yet is not going quiet, it is simply waiting, and mixing
 * the two would bury the ones that need a nudge.
 */
export const QUIET_AFTER_DAYS = 7;

export function isGoneQuiet(
  relationship: { last_interaction_at: string | null; archived_at: string | null },
  now: Date,
  windowDays = QUIET_AFTER_DAYS
): boolean {
  if (relationship.archived_at) return false;
  if (!relationship.last_interaction_at) return false;
  const last = new Date(relationship.last_interaction_at).getTime();
  return now.getTime() - last > windowDays * 24 * 60 * 60 * 1000;
}

/** Formats a `duration_seconds` from stage history as "4d", "3h", "12m". */
export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * Relative time for the timeline: "just now", "3h ago", "12 Mar".
 *
 * Handles both directions. Half of what the CRM renders is in the future —
 * upcoming meetings, tasks due next week — and a past-only formatter collapses
 * all of it to "just now", which is worse than showing nothing.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  if (!iso) return '—';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '—';

  const diff = now.getTime() - then.getTime();
  const future = diff < 0;
  const minutes = Math.floor(Math.abs(diff) / 60000);

  const ago = (value: string) => (future ? `in ${value}` : `${value} ago`);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return ago(`${minutes}m`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return ago(`${hours}h`);
  const days = Math.floor(hours / 24);
  if (days < 7) return ago(`${days}d`);

  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Follow-up bucketing
// ---------------------------------------------------------------------------

/**
 * Days of silence after which the nightly sweep moves an investor to No
 * Response. Mirrored in pages/api/cron/no-response.js — change both together.
 */
export const NO_RESPONSE_AFTER_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days since an ISO timestamp. Null in, null out. */
export function wholeDaysSince(iso: string | null, now: number = Date.now()): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now - then) / DAY_MS));
}

/**
 * Which follow-up bucket a silence belongs to.
 *
 * Lives here rather than in the route or the component because the server sorts
 * by it and the client groups by it; two implementations would eventually
 * disagree about the boundary and put an investor in a heading whose count says
 * otherwise.
 *
 * A null — never pitched — sorts into 'today' rather than a bucket of its own:
 * nothing is overdue for someone who was never contacted.
 */
export function followupBucket(days: number | null): FollowupBucket {
  if (days == null || days < 3) return 'today';
  if (days < 7) return 'three_to_seven';
  if (days < NO_RESPONSE_AFTER_DAYS) return 'seven_to_fourteen';
  return 'over_fourteen';
}

export const FOLLOWUP_BUCKET_ORDER: FollowupBucket[] = [
  'over_fourteen',
  'seven_to_fourteen',
  'three_to_seven',
  'today',
];

export const FOLLOWUP_BUCKET_LABEL: Record<FollowupBucket, string> = {
  over_fourteen: 'Over 14 days',
  seven_to_fourteen: '7–14 days',
  three_to_seven: '3–7 days',
  today: 'Recently pitched',
};
