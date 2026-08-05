import type { CrmEventType, RelationshipEvent } from '@/types/crm';

/**
 * Event presentation metadata.
 *
 * The timeline is the centre of the product, so how each event reads is defined
 * once here rather than in a switch statement inside the component. Adding an
 * event type means one entry in this table and one value in the Postgres enum —
 * nothing else in the UI needs to know about it.
 */

export type EventTone = 'neutral' | 'outbound' | 'inbound' | 'positive' | 'negative' | 'system';

export interface EventMeta {
  label: string;
  /** Single glyph rendered in the timeline rail. Text, so no icon dependency. */
  glyph: string;
  tone: EventTone;
  /** Counts as real contact with the investor, as opposed to internal bookkeeping. */
  isContact: boolean;
}

export const EVENT_META: Record<CrmEventType, EventMeta> = {
  INVESTOR_ADDED:       { label: 'Added to pipeline',  glyph: '+',  tone: 'system',   isContact: false },
  PITCH_GENERATED:      { label: 'Pitch generated',    glyph: '✎',  tone: 'neutral',  isContact: false },
  PITCH_REGENERATED:    { label: 'Pitch regenerated',  glyph: '↻',  tone: 'neutral',  isContact: false },
  EMAIL_SENT:           { label: 'Email sent',         glyph: '→',  tone: 'outbound', isContact: true  },
  EMAIL_OPENED:         { label: 'Email opened',       glyph: '◉',  tone: 'inbound',  isContact: true  },
  FOLLOWUP_SENT:        { label: 'Follow-up sent',     glyph: '⇢',  tone: 'outbound', isContact: true  },
  REPLIED:              { label: 'Replied',            glyph: '←',  tone: 'inbound',  isContact: true  },
  MEETING_SCHEDULED:    { label: 'Meeting scheduled',  glyph: '◷',  tone: 'positive', isContact: true  },
  MEETING_COMPLETED:    { label: 'Meeting held',       glyph: '✓',  tone: 'positive', isContact: true  },
  CALL_LOGGED:          { label: 'Call logged',        glyph: '☏',  tone: 'inbound',  isContact: true  },
  DEMO_GIVEN:           { label: 'Demo given',         glyph: '▷',  tone: 'positive', isContact: true  },
  WARM_INTRO:           { label: 'Warm intro',         glyph: '⇄',  tone: 'positive', isContact: true  },
  STAGE_CHANGED:        { label: 'Stage changed',      glyph: '⇥',  tone: 'system',   isContact: false },
  CAMPAIGN_CHANGED:     { label: 'Campaign changed',   glyph: '⇄',  tone: 'system',   isContact: false },
  NOTE_ADDED:           { label: 'Note',               glyph: '❝',  tone: 'neutral',  isContact: false },
  TASK_CREATED:         { label: 'Task created',       glyph: '◻',  tone: 'system',   isContact: false },
  TASK_COMPLETED:       { label: 'Task completed',     glyph: '◼',  tone: 'system',   isContact: false },
  INVESTMENT_COMMITTED: { label: 'Investment committed', glyph: '★', tone: 'positive', isContact: false },
  PASS_RECEIVED:        { label: 'Passed',             glyph: '✕',  tone: 'negative', isContact: false },
  SEQUENCE_STARTED:     { label: 'Sequence started',   glyph: '▶',  tone: 'system',   isContact: false },
  SEQUENCE_PAUSED:      { label: 'Sequence paused',    glyph: '‖',  tone: 'system',   isContact: false },
  SEQUENCE_RESUMED:     { label: 'Sequence resumed',   glyph: '▶',  tone: 'system',   isContact: false },
  SEQUENCE_STOPPED:     { label: 'Sequence stopped',   glyph: '■',  tone: 'system',   isContact: false },
  ARCHIVED:             { label: 'Archived',           glyph: '⊘',  tone: 'system',   isContact: false },
};

/** Falls back rather than throwing, so an enum value added server-side first
 *  degrades to a readable row instead of crashing the timeline. */
export function eventMeta(type: CrmEventType): EventMeta {
  return (
    EVENT_META[type] ?? {
      label: String(type).toLowerCase().replace(/_/g, ' '),
      glyph: '•',
      tone: 'neutral' as EventTone,
      isContact: false,
    }
  );
}

/** Event types the founder can log by hand. The rest are written by the system. */
export const MANUAL_EVENT_TYPES: CrmEventType[] = [
  'CALL_LOGGED',
  'DEMO_GIVEN',
  'WARM_INTRO',
  'REPLIED',
  'MEETING_COMPLETED',
];

export function eventSummary(event: RelationshipEvent): string {
  if (event.summary && event.summary.trim()) return event.summary;
  return eventMeta(event.event_type).label;
}

/** Groups events by calendar day for the timeline's date headers. */
export function groupEventsByDay(
  events: RelationshipEvent[]
): Array<{ day: string; events: RelationshipEvent[] }> {
  const buckets = new Map<string, RelationshipEvent[]>();

  for (const event of events) {
    const day = event.occurred_at.slice(0, 10);
    const bucket = buckets.get(day);
    if (bucket) bucket.push(event);
    else buckets.set(day, [event]);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, dayEvents]) => ({ day, events: dayEvents }));
}
