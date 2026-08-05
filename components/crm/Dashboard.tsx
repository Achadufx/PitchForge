import React, { useState, useEffect } from 'react';
import tokens from '@/lib/designTokens';
import { crmApi, ApiError } from '@/lib/crm/api';
import type { DashboardSummary, Plan } from '@/types/crm';
import { Spinner, ErrorNote, Card, Button, Badge, SectionTitle, EmptyState } from '@/components/crm/ui';
import StatsPanel from '@/components/crm/StatsPanel';
import { relativeTime } from '@/lib/crm/stats';
import { eventMeta } from '@/lib/crm/events';

const c = tokens.colors;

export default function CrmDashboard({ plan }: { plan: Plan }) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await crmApi.get<DashboardSummary>('/api/crm/dashboard');
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Spinner label="Loading dashboard" />;
  if (error) return <ErrorNote onRetry={load}>{error}</ErrorNote>;
  if (!data) return <EmptyState title="No data" body="Your dashboard is empty." />;

  const { stats, stageCounts, overdueTasks, upcomingTasks, upcomingMeetings, recentEvents, goneQuiet } = data;

  const shownMeetings = upcomingMeetings.slice(0, 4);
  const shownTasks = upcomingTasks.slice(0, 6);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: c.text.primary,
            letterSpacing: '-0.5px',
            marginBottom: 4,
          }}
        >
          CRM Dashboard
        </h1>
        <p style={{ fontSize: 13, color: c.text.secondary }}>
          {data.totalActive} active relationship{data.totalActive === 1 ? '' : 's'}
        </p>
      </div>

      {/* Campaign funnel — pitched, opened, replied, met, plus where everyone
          is standing right now. */}
      {stats && <StatsPanel stats={stats} stageCounts={stageCounts} />}

      {/* Pipeline stages. Only when there are no campaign stats to hang the
          progress bar off — otherwise this is the same information twice. */}
      {!stats && stageCounts.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle>Pipeline</SectionTitle>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {stageCounts.map(({ stage, count }) => (
              <div
                key={stage.id}
                style={{
                  background: c.bg.card,
                  border: `1px solid ${c.border.default}`,
                  borderRadius: tokens.radius.md,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flex: '1 1 140px',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: stage.color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: c.text.primary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {stage.name}
                  </div>
                  <div style={{ fontSize: 12, color: c.text.muted }}>{count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue tasks */}
      {overdueTasks.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle>Overdue</SectionTitle>
          <Card padding={0}>
            {overdueTasks.slice(0, 8).map((task, idx) => (
              <div
                key={task.id}
                style={{
                  padding: '14px 18px',
                  borderBottom:
                    idx < Math.min(overdueTasks.length, 8) - 1 ? `1px solid ${c.border.default}` : undefined,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: c.text.primary, marginBottom: 3 }}>
                  {task.title}
                </div>
                <div style={{ fontSize: 12, color: c.text.muted }}>
                  {task.relationship?.investor_firm} · Due {relativeTime(task.due_at || '')}
                </div>
              </div>
            ))}
          </Card>
          {overdueTasks.length > 8 && (
            <p style={{ fontSize: 12, color: c.text.muted, marginTop: 8, textAlign: 'right' }}>
              +{overdueTasks.length - 8} more
            </p>
          )}
        </div>
      )}

      {/* Upcoming */}
      {(upcomingTasks.length > 0 || upcomingMeetings.length > 0) && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle>Upcoming</SectionTitle>
          <Card padding={0}>
            {shownMeetings.map((meeting, idx) => (
              <div
                key={meeting.id}
                style={{
                  padding: '14px 18px',
                  // The divider belongs between rows, and meetings and tasks are
                  // one continuous list here — so the last meeting only gets a
                  // border when a task follows it.
                  borderBottom:
                    idx < shownMeetings.length - 1 || shownTasks.length > 0
                      ? `1px solid ${c.border.default}`
                      : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 16 }} aria-hidden>
                    📅
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: c.text.primary }}>
                    {meeting.title || 'Meeting'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: c.text.muted, paddingLeft: 24 }}>
                  {meeting.relationship?.investor_firm} · {relativeTime(meeting.scheduled_at)}
                </div>
              </div>
            ))}
            {shownTasks.map((task, idx) => (
              <div
                key={task.id}
                style={{
                  padding: '14px 18px',
                  borderBottom: idx < shownTasks.length - 1 ? `1px solid ${c.border.default}` : undefined,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: c.text.primary, marginBottom: 3 }}>
                  {task.title}
                </div>
                <div style={{ fontSize: 12, color: c.text.muted }}>
                  {task.relationship?.investor_firm} · {relativeTime(task.due_at || '')}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Gone quiet */}
      {goneQuiet.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle>
            Gone quiet ({data.quietAfterDays}+ days)
          </SectionTitle>
          <Card padding={0}>
            {goneQuiet.slice(0, 8).map((rel, idx) => (
              <div
                key={rel.id}
                style={{
                  padding: '14px 18px',
                  borderBottom: idx < Math.min(goneQuiet.length, 8) - 1 ? `1px solid ${c.border.default}` : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: c.text.primary }}>{rel.investor_firm}</span>
                  <Badge color={rel.stage?.color}>{rel.stage?.name}</Badge>
                </div>
                <div style={{ fontSize: 12, color: c.text.muted }}>
                  Last contact {relativeTime(rel.last_interaction_at || '')}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Recent activity */}
      {recentEvents.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle>Recent activity</SectionTitle>
          <Card padding={0}>
            {recentEvents.slice(0, 12).map((event, idx) => {
              const meta = eventMeta(event.event_type);
              return (
                <div
                  key={event.id}
                  style={{
                    padding: '14px 18px',
                    borderBottom:
                      idx < Math.min(recentEvents.length, 12) - 1 ? `1px solid ${c.border.default}` : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 16,
                        lineHeight: 1.4,
                        flexShrink: 0,
                        opacity: 0.8,
                      }}
                      aria-hidden
                    >
                      {meta.glyph}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: c.text.primary, marginBottom: 2 }}>
                        {event.summary || meta.label}
                      </div>
                      <div style={{ fontSize: 12, color: c.text.muted }}>
                        {event.relationship?.investor_firm} · {relativeTime(event.occurred_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* Empty state when everything is empty */}
      {!stats &&
        stageCounts.length === 0 &&
        overdueTasks.length === 0 &&
        upcomingTasks.length === 0 &&
        upcomingMeetings.length === 0 &&
        goneQuiet.length === 0 &&
        recentEvents.length === 0 && (
          <EmptyState
            title="Your CRM is empty"
            body="Start by creating a campaign and adding investors to your pipeline."
            action={
              <Button variant="primary" onClick={() => (window.location.hash = '#campaigns')}>
                Create campaign
              </Button>
            }
          />
        )}
    </div>
  );
}
