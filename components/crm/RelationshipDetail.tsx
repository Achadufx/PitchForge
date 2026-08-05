import React, { useState, useEffect, useCallback } from 'react';
import tokens from '@/lib/designTokens';
import { crmApi, ApiError } from '@/lib/crm/api';
import type {
  RelationshipDetailResponse,
  PipelineStage,
  RelationshipEvent,
  RelationshipNote,
  Task,
  CrmEventType,
  Plan,
} from '@/types/crm';
import {
  Spinner,
  ErrorNote,
  Card,
  Button,
  Badge,
  SectionTitle,
  Field,
  TextInput,
  TextArea,
  Select,
  EmptyState,
  hexWash,
} from '@/components/crm/ui';
import { relativeTime } from '@/lib/crm/stats';
import { eventMeta, eventSummary, groupEventsByDay, MANUAL_EVENT_TYPES, EVENT_META } from '@/lib/crm/events';

const c = tokens.colors;

/**
 * Timeline rail colours. Every value is a real token — the palette is warm
 * monochrome with no blue, so "inbound" earns emphasis through near-black
 * weight rather than a hue the design system does not have.
 */
const TONE_COLOR: Record<string, string> = {
  neutral: c.text.secondary,
  outbound: c.accent.secondary,
  inbound: c.accent.primary,
  positive: c.status.success,
  negative: c.status.error,
  system: c.text.muted,
};

type Panel = 'timeline' | 'notes' | 'tasks';

export default function RelationshipDetail({
  id,
  plan,
  stages,
  onBack,
  onChanged,
}: {
  id: string;
  plan: Plan;
  stages: PipelineStage[];
  onBack: () => void;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<RelationshipDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('timeline');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmApi.get<RelationshipDetailResponse>(`/api/crm/relationships/${id}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load investor');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchRelationship(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await crmApi.patch(`/api/crm/relationships/${id}`, body);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="Loading investor" />;
  if (!data) return <ErrorNote onRetry={load}>{error || 'Investor not found'}</ErrorNote>;

  const rel = data.relationship;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 14, paddingLeft: 0 }}>
        ← Back to pipeline
      </Button>

      {error && <ErrorNote onRetry={load}>{error}</ErrorNote>}

      {/* Header */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: c.text.primary,
                margin: '0 0 4px',
                letterSpacing: '-0.4px',
              }}
            >
              {rel.investor_firm}
            </h1>
            <div style={{ fontSize: 13, color: c.text.secondary }}>
              {rel.investor_contact || 'No contact name'}
              {rel.investor_email && (
                <>
                  {' · '}
                  <a href={`mailto:${rel.investor_email}`} style={{ color: c.accent.secondary }}>
                    {rel.investor_email}
                  </a>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {rel.stage && <Badge color={rel.stage.color}>{rel.stage.name}</Badge>}
              {rel.campaign && <Badge>{rel.campaign.name}</Badge>}
              {rel.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>

          <div style={{ flex: '0 1 190px', minWidth: 170 }}>
            <Select
              value={rel.stage_id}
              disabled={busy}
              onChange={(e) => patchRelationship({ stage_id: e.target.value })}
              aria-label="Stage"
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </Select>
            <div style={{ fontSize: 11, color: c.text.muted, marginTop: 6 }}>
              In stage since {relativeTime(rel.stage_changed_at)}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 18,
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${c.border.default}`,
            flexWrap: 'wrap',
            fontSize: 12,
            color: c.text.muted,
          }}
        >
          <span>
            Last contact{' '}
            {rel.last_interaction_at ? relativeTime(rel.last_interaction_at) : 'never'}
          </span>
          <span>{data.emails.length} email{data.emails.length === 1 ? '' : 's'}</span>
          <span>{data.meetings.length} meeting{data.meetings.length === 1 ? '' : 's'}</span>
          <span>{data.pitches.length} pitch{data.pitches.length === 1 ? '' : 'es'}</span>
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => patchRelationship({ archived: !rel.archived_at })}
            style={{ marginLeft: 'auto' }}
          >
            {rel.archived_at ? 'Restore' : 'Archive'}
          </Button>
        </div>
      </Card>

      {/* Panel switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['timeline', 'notes', 'tasks'] as Panel[]).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={panel === key ? 'primary' : 'secondary'}
            onClick={() => setPanel(key)}
          >
            {key === 'timeline'
              ? `Timeline (${data.events.length})`
              : key === 'notes'
              ? `Notes (${data.notes.length})`
              : `Tasks (${data.tasks.filter((t) => t.status === 'pending').length})`}
          </Button>
        ))}
      </div>

      {panel === 'timeline' && (
        <Timeline
          events={data.events}
          historyWindowDays={data.historyWindowDays}
          relationshipId={id}
          onLogged={load}
        />
      )}
      {panel === 'notes' && <Notes notes={data.notes} relationshipId={id} onChanged={load} />}
      {panel === 'tasks' && <Tasks tasks={data.tasks} relationshipId={id} onChanged={load} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function Timeline({
  events,
  historyWindowDays,
  relationshipId,
  onLogged,
}: {
  events: RelationshipEvent[];
  historyWindowDays: number | null;
  relationshipId: string;
  onLogged: () => void;
}) {
  const [logging, setLogging] = useState(false);
  const [type, setType] = useState<CrmEventType>('CALL_LOGGED');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = groupEventsByDay(events);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await crmApi.post('/api/crm/events', {
        relationship_id: relationshipId,
        event_type: type,
        summary: summary.trim() || null,
      });
      setSummary('');
      setLogging(false);
      onLogged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log that');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionTitle
        action={
          <Button size="sm" onClick={() => setLogging((v) => !v)}>
            {logging ? 'Cancel' : 'Log activity'}
          </Button>
        }
      >
        Timeline
      </SectionTitle>

      {error && <ErrorNote>{error}</ErrorNote>}

      {logging && (
        <Card style={{ marginBottom: 16 }}>
          <form onSubmit={submit}>
            <Field label="What happened">
              <Select value={type} onChange={(e) => setType(e.target.value as CrmEventType)}>
                {MANUAL_EVENT_TYPES.map((key) => (
                  <option key={key} value={key}>
                    {EVENT_META[key].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Details" hint="Optional — what was said, what comes next.">
              <TextArea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Partner asked for the data room and a customer reference…"
              />
            </Field>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Log it'}
            </Button>
          </form>
        </Card>
      )}

      {events.length === 0 ? (
        <EmptyState title="Nothing logged yet" body="Emails, meetings and stage changes will appear here." />
      ) : (
        <div>
          {days.map(({ day, events: dayEvents }) => (
            <div key={day} style={{ marginBottom: 22 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: c.text.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                }}
              >
                {new Date(day).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>

              {dayEvents.map((event) => {
                const meta = eventMeta(event.event_type);
                const tone = TONE_COLOR[meta.tone] || c.text.muted;
                return (
                  <div key={event.id} style={{ display: 'flex', gap: 12, paddingBottom: 14 }}>
                    {/* Rail */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: hexWash(tone, 0.12),
                          border: `1px solid ${hexWash(tone, 0.3)}`,
                          color: tone,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          lineHeight: 1,
                        }}
                        aria-hidden
                      >
                        {meta.glyph}
                      </div>
                      <div style={{ flex: 1, width: 1, background: c.border.default, marginTop: 4 }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
                      <div style={{ fontSize: 14, color: c.text.primary, lineHeight: 1.5 }}>
                        {eventSummary(event)}
                      </div>
                      <div style={{ fontSize: 12, color: c.text.muted, marginTop: 2 }}>
                        {meta.label} · {relativeTime(event.occurred_at)}
                        {event.is_manual && ' · logged by hand'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {historyWindowDays != null && (
            <p style={{ fontSize: 12, color: c.text.muted, textAlign: 'center', marginTop: 4 }}>
              Showing the last {historyWindowDays} days. Nothing older is deleted — upgrade to see the full
              history.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

function Notes({
  notes,
  relationshipId,
  onChanged,
}: {
  notes: RelationshipNote[];
  relationshipId: string;
  onChanged: () => void;
}) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await crmApi.post('/api/crm/notes', { relationship_id: relationshipId, body: body.trim() });
      setBody('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save that note');
    } finally {
      setSaving(false);
    }
  }

  async function remove(noteId: string) {
    setError(null);
    try {
      await crmApi.del(`/api/crm/notes?id=${noteId}`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete that note');
    }
  }

  return (
    <div>
      <SectionTitle>Notes</SectionTitle>
      {error && <ErrorNote>{error}</ErrorNote>}

      <Card style={{ marginBottom: 16 }}>
        <form onSubmit={add}>
          <TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What did you learn about this investor?"
            aria-label="New note"
          />
          <div style={{ marginTop: 10 }}>
            <Button type="submit" variant="primary" disabled={saving || !body.trim()}>
              {saving ? 'Saving…' : 'Add note'}
            </Button>
          </div>
        </form>
      </Card>

      {notes.length === 0 ? (
        <EmptyState title="No notes" body="Anything you write here stays with this investor." />
      ) : (
        notes.map((note) => (
          <Card key={note.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: c.text.primary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {note.body}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 10,
                fontSize: 12,
                color: c.text.muted,
              }}
            >
              <span>
                {relativeTime(note.created_at)}
                {note.updated_at !== note.created_at && ' · edited'}
              </span>
              <Button size="sm" variant="ghost" onClick={() => remove(note.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

function Tasks({
  tasks,
  relationshipId,
  onChanged,
}: {
  tasks: Task[];
  relationshipId: string;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await crmApi.post('/api/crm/tasks', {
        relationship_id: relationshipId,
        title: title.trim(),
        // datetime-local gives a naive string; the Date round-trip attaches the
        // browser's offset so a 9am reminder means 9am where the founder is.
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      });
      setTitle('');
      setDueAt('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create that task');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(task: Task) {
    setError(null);
    try {
      await crmApi.patch(`/api/crm/tasks?id=${task.id}`, {
        status: task.status === 'completed' ? 'pending' : 'completed',
      });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update that task');
    }
  }

  const pending = tasks.filter((t) => t.status === 'pending');
  const done = tasks.filter((t) => t.status === 'completed');

  return (
    <div>
      <SectionTitle>Tasks</SectionTitle>
      {error && <ErrorNote>{error}</ErrorNote>}

      <Card style={{ marginBottom: 16 }}>
        <form onSubmit={add}>
          <Field label="Task">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Send the updated deck"
            />
          </Field>
          <Field label="Due" hint="Optional.">
            <TextInput type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : 'Add task'}
          </Button>
        </form>
      </Card>

      {tasks.length === 0 && <EmptyState title="No tasks" body="Give yourself a next step for this investor." />}

      {[...pending, ...done].map((task) => {
        const overdue = task.status === 'pending' && task.due_at && new Date(task.due_at) < new Date();
        return (
          <Card key={task.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <input
                type="checkbox"
                checked={task.status === 'completed'}
                onChange={() => toggle(task)}
                aria-label={`Mark "${task.title}" ${task.status === 'completed' ? 'incomplete' : 'complete'}`}
                style={{ width: 18, height: 18, marginTop: 2, cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: task.status === 'completed' ? c.text.muted : c.text.primary,
                    textDecoration: task.status === 'completed' ? 'line-through' : undefined,
                  }}
                >
                  {task.title}
                </div>
                {task.due_at && (
                  <div
                    style={{
                      fontSize: 12,
                      color: overdue ? c.status.error : c.text.muted,
                      marginTop: 3,
                      fontWeight: overdue ? 600 : 400,
                    }}
                  >
                    {overdue ? 'Overdue — due ' : 'Due '}
                    {relativeTime(task.due_at)}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
