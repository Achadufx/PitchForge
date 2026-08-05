-- ============================================================================
-- PitchWire CRM — Phase 1 child tables
-- Depends on 0001_crm_core.sql and 0002_crm_tables.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- relationship_events — the timeline
-- ---------------------------------------------------------------------------
-- Append-only activity feed. Everything that happens to a relationship lands
-- here, whether the app logged it automatically or the founder recorded it by
-- hand. `payload` carries the type-specific detail (old/new stage, pitch id,
-- meeting time) so adding a new event type never needs a schema change.
--
-- owner_id is duplicated from the parent relationship on purpose: RLS policies
-- that walk a join are markedly slower, and this table is the hottest read on
-- the relationship page.
CREATE TABLE IF NOT EXISTS relationship_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id  uuid NOT NULL REFERENCES investor_relationships(id) ON DELETE CASCADE,
  event_type       crm_event_type NOT NULL,
  -- Free-text summary rendered in the feed. Kept denormalised so the timeline
  -- reads without resolving every referenced row.
  summary          text,
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- True when the founder logged this by hand rather than the app recording it.
  is_manual        boolean NOT NULL DEFAULT false,
  -- When the thing actually happened, which is not always when it was recorded:
  -- a reply logged on Friday may have arrived on Wednesday.
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS relationship_events_relationship_idx
  ON relationship_events (relationship_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS relationship_events_owner_recent_idx
  ON relationship_events (owner_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS relationship_events_type_idx
  ON relationship_events (owner_id, event_type, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- relationship_stage_history
-- ---------------------------------------------------------------------------
-- Dedicated table rather than reading STAGE_CHANGED events back out of the
-- timeline: funnel and time-in-stage analytics want indexed columns and a
-- duration, not a jsonb scan.
CREATE TABLE IF NOT EXISTS relationship_stage_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id  uuid NOT NULL REFERENCES investor_relationships(id) ON DELETE CASCADE,
  from_stage_id    uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id      uuid NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  -- Seconds spent in from_stage. Null on the first entry, which has no origin.
  duration_seconds integer,
  changed_at       timestamptz NOT NULL DEFAULT now(),
  changed_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS relationship_stage_history_relationship_idx
  ON relationship_stage_history (relationship_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS relationship_stage_history_owner_idx
  ON relationship_stage_history (owner_id, to_stage_id, changed_at DESC);

-- ---------------------------------------------------------------------------
-- generated_pitches — AI output
-- ---------------------------------------------------------------------------
-- Separate from sent_emails because most generated pitches are never sent, some
-- are regenerated several times, and founders edit them before sending. This
-- table is the record of what the model produced; sent_emails is the record of
-- what actually left the building.
CREATE TABLE IF NOT EXISTS generated_pitches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Nullable: a pitch can be generated in the campaign builder before any
  -- relationship exists, then linked once the founder commits to sending.
  relationship_id  uuid REFERENCES investor_relationships(id) ON DELETE CASCADE,
  investor_firm    text,
  investor_name    text,
  subject          text NOT NULL,
  body             text NOT NULL,
  -- What the research step surfaced, kept so the founder can see why the pitch
  -- opened the way it did.
  research_notes   text,
  model            text,
  -- Increments when the founder asks for another take on the same investor.
  revision         integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generated_pitches_relationship_idx
  ON generated_pitches (relationship_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generated_pitches_owner_idx
  ON generated_pitches (owner_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- sent_emails — actual communication
-- ---------------------------------------------------------------------------
-- One row per message that left the system. generated_pitch_id is null for a
-- manually written follow-up, which is exactly why this is a separate table
-- from generated_pitches rather than a flag on it.
CREATE TABLE IF NOT EXISTS sent_emails (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id     uuid NOT NULL REFERENCES investor_relationships(id) ON DELETE CASCADE,
  generated_pitch_id  uuid REFERENCES generated_pitches(id) ON DELETE SET NULL,
  email_type          crm_email_type NOT NULL DEFAULT 'initial_pitch',
  to_email            text NOT NULL,
  subject             text NOT NULL,
  body                text NOT NULL,
  -- Resend's message id, needed to reconcile delivery webhooks later.
  provider_message_id text,
  delivery_status     text NOT NULL DEFAULT 'sent',
  error_message       text,
  sent_at             timestamptz NOT NULL DEFAULT now(),
  opened_at           timestamptz,
  replied_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sent_emails_relationship_idx
  ON sent_emails (relationship_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS sent_emails_owner_idx
  ON sent_emails (owner_id, sent_at DESC);
-- Webhook reconciliation looks up by provider id, so it needs its own index.
CREATE INDEX IF NOT EXISTS sent_emails_provider_idx
  ON sent_emails (provider_message_id) WHERE provider_message_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- tasks — reminders generalised
-- ---------------------------------------------------------------------------
-- A follow-up reminder is just a task with type = 'followup'. Modelling it this
-- way means "review pitch", "prepare meeting", "send deck" and anything else
-- added later need no schema change, and the dashboard's overdue queue is one
-- query rather than a union across several tables.
--
-- relationship_id is nullable so a founder can keep a campaign-level or
-- standalone task that is not about one specific investor.
CREATE TABLE IF NOT EXISTS tasks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id  uuid REFERENCES investor_relationships(id) ON DELETE CASCADE,
  campaign_id      uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  type             crm_task_type NOT NULL DEFAULT 'followup',
  title            text NOT NULL,
  notes            text,
  status           crm_task_status NOT NULL DEFAULT 'pending',
  priority         crm_priority NOT NULL DEFAULT 'normal',
  due_at           timestamptz,
  completed_at     timestamptz,
  -- Points at auth.users for the multi-founder future; today it equals owner_id.
  assigned_to      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_title_not_blank CHECK (length(btrim(title)) > 0)
);

-- The dashboard's overdue and upcoming queues both read this index.
CREATE INDEX IF NOT EXISTS tasks_owner_due_idx
  ON tasks (owner_id, due_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS tasks_relationship_idx
  ON tasks (relationship_id, status, due_at);

DROP TRIGGER IF EXISTS tasks_touch ON tasks;
CREATE TRIGGER tasks_touch BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION crm_touch_updated_at();

-- ---------------------------------------------------------------------------
-- relationship_notes
-- ---------------------------------------------------------------------------
-- Notes are their own table rather than NOTE_ADDED events because they are
-- editable and deletable, and the timeline is append-only. The trigger in
-- 0005 mirrors each note into the feed as an event.
CREATE TABLE IF NOT EXISTS relationship_notes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id  uuid NOT NULL REFERENCES investor_relationships(id) ON DELETE CASCADE,
  body             text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT relationship_notes_body_not_blank CHECK (length(btrim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS relationship_notes_relationship_idx
  ON relationship_notes (relationship_id, created_at DESC);

DROP TRIGGER IF EXISTS relationship_notes_touch ON relationship_notes;
CREATE TRIGGER relationship_notes_touch BEFORE UPDATE ON relationship_notes
  FOR EACH ROW EXECUTE FUNCTION crm_touch_updated_at();

-- ---------------------------------------------------------------------------
-- relationship_meetings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_meetings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id  uuid NOT NULL REFERENCES investor_relationships(id) ON DELETE CASCADE,
  title            text,
  meeting_type     text NOT NULL DEFAULT 'video',
  scheduled_at     timestamptz NOT NULL,
  duration_minutes integer,
  location         text,
  notes            text,
  outcome          text,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relationship_meetings_relationship_idx
  ON relationship_meetings (relationship_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS relationship_meetings_owner_upcoming_idx
  ON relationship_meetings (owner_id, scheduled_at) WHERE completed_at IS NULL;

DROP TRIGGER IF EXISTS relationship_meetings_touch ON relationship_meetings;
CREATE TRIGGER relationship_meetings_touch BEFORE UPDATE ON relationship_meetings
  FOR EACH ROW EXECUTE FUNCTION crm_touch_updated_at();
