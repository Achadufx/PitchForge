import type { CampaignStats, CampaignStatsRow } from '@/types/crm';

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
    reply_rate: rate(row.investors_replied, contacted),
    meeting_rate: rate(row.investors_met, contacted),
    investment_rate: rate(row.investments, contacted),
  };
}

/** Sums several campaigns into one all-time view for the dashboard header. */
export function aggregateStats(rows: CampaignStatsRow[]): CampaignStats | null {
  if (!rows.length) return null;

  const first = rows[0];
  const total = rows.reduce<CampaignStatsRow>(
    (acc, row) => ({
      ...acc,
      total_investors: acc.total_investors + row.total_investors,
      investments: acc.investments + row.investments,
      passes: acc.passes + row.passes,
      investors_emailed: acc.investors_emailed + row.investors_emailed,
      investors_replied: acc.investors_replied + row.investors_replied,
      investors_met: acc.investors_met + row.investors_met,
      emails_sent: acc.emails_sent + row.emails_sent,
      pitches_generated: acc.pitches_generated + row.pitches_generated,
      last_activity_at:
        !acc.last_activity_at ||
        (row.last_activity_at && row.last_activity_at > acc.last_activity_at)
          ? row.last_activity_at
          : acc.last_activity_at,
    }),
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
      emails_sent: 0,
      pitches_generated: 0,
      last_activity_at: null,
    }
  );

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

/** Relative time for the timeline: "just now", "3h ago", "12 Mar". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  });
}
