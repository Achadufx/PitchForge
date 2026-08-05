import React from 'react';
import tokens from '@/lib/designTokens';
import type { CampaignStats, PipelineStage } from '@/types/crm';
import { Card, hexWash } from '@/components/crm/ui';

const c = tokens.colors;

/**
 * The campaign funnel.
 *
 * Six numbers, in the order a raise actually happens: pitched → opened →
 * replied → met → committed, with the time it takes to hear back. Everything is
 * a rate against investors *pitched*, never against investors *added* — a
 * founder who imports 300 names and emails 20 has a reply rate out of 20, and
 * measuring against 300 would make their numbers collapse every time they
 * imported a list.
 *
 * The bar underneath is where the pipeline is standing right now, which is a
 * different question from how it has performed and so gets its own row.
 */
export default function StatsPanel({
  stats,
  stageCounts,
}: {
  stats: CampaignStats;
  stageCounts?: Array<{ stage: PipelineStage; count: number }>;
}) {
  // PostgREST hands numeric back as a JSON number, but a string would render as
  // "3.4 days" either way — coerce so the arithmetic below cannot surprise us.
  const daysToReply =
    stats.avg_days_to_first_reply == null ? null : Number(stats.avg_days_to_first_reply);

  const totalInStages = (stageCounts || []).reduce((sum, entry) => sum + entry.count, 0);

  return (
    <Card padding="20px 22px" style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 18,
        }}
      >
        <Stat label="Pitched" value={stats.investors_emailed} sub={`${stats.emails_sent} emails`} />
        <Stat
          label="Open rate"
          value={`${stats.open_rate}%`}
          sub={`${stats.investors_opened} opened`}
        />
        <Stat
          label="Reply rate"
          value={`${stats.reply_rate}%`}
          sub={`${stats.investors_replied} replied`}
        />
        <Stat
          label="Meetings"
          value={`${stats.meeting_rate}%`}
          sub={`${stats.investors_met} booked`}
        />
        <Stat
          label="Avg. reply time"
          value={daysToReply == null ? '—' : `${daysToReply}d`}
          sub={daysToReply == null ? 'No replies yet' : 'From first send'}
        />
        <Stat
          label="Invested"
          value={stats.investments}
          sub={stats.investment_rate > 0 ? `${stats.investment_rate}%` : undefined}
          highlight
        />
      </div>

      {stageCounts && stageCounts.length > 0 && totalInStages > 0 && (
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${c.border.default}` }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: c.text.muted,
              marginBottom: 10,
            }}
          >
            Where everyone is now
          </div>

          <div
            role="img"
            aria-label={stageCounts
              .filter((entry) => entry.count > 0)
              .map((entry) => `${entry.stage.name}: ${entry.count}`)
              .join(', ')}
            style={{
              display: 'flex',
              height: 10,
              borderRadius: tokens.radius.full,
              overflow: 'hidden',
              background: c.bg.surface,
            }}
          >
            {stageCounts
              .filter((entry) => entry.count > 0)
              .map((entry) => (
                <div
                  key={entry.stage.id}
                  title={`${entry.stage.name}: ${entry.count}`}
                  style={{
                    // Percentages rather than flex-grow so a stage with one
                    // investor stays visibly one investor wide.
                    width: `${(entry.count / totalInStages) * 100}%`,
                    background: entry.stage.color,
                  }}
                />
              ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {stageCounts
              .filter((entry) => entry.count > 0)
              .map((entry) => (
                <span
                  key={entry.stage.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: c.text.secondary,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: entry.stage.color,
                      border: `1px solid ${hexWash(entry.stage.color, 0.5)}`,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                  {entry.stage.name}
                  <strong style={{ color: c.text.primary, fontWeight: 700 }}>{entry.count}</strong>
                </span>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number | string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: c.text.muted,
          marginBottom: 4,
          letterSpacing: '0.03em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: highlight ? c.accent.secondary : c.text.primary,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: c.text.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
