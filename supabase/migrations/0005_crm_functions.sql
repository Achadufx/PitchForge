-- ============================================================================
-- PitchWire CRM — functions and triggers
-- Depends on 0001–0004.
-- ============================================================================
-- Everything here exists so the application never has to remember to keep two
-- tables in agreement. Stage changes land in history, events touch the
-- relationship's last_interaction_at, notes mirror into the feed. If any of
-- this lived in API routes, the one code path that forgot would silently
-- corrupt the analytics.
--
-- The trigger functions are SECURITY DEFINER so they can write to append-only
-- tables that have no client insert policy. Each one derives owner_id from the
-- row being changed, never from a parameter, so a caller cannot aim them at
-- another user's data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- crm_ensure_default_stages — idempotent pipeline seeding
-- ---------------------------------------------------------------------------
-- Called on first CRM load. Seeds the default fundraising pipeline for a
-- founder who has none, and does nothing at all for a founder who does — so a
-- user who renamed or deleted stages never has them resurrected underneath
-- them. Returns the stage rows either way, which saves the client a follow-up
-- query on the common path.
--
-- The stages are seeded as data, not compiled in: this function is the only
-- place in the system that knows the default names, and user-configurable
-- pipelines need no further change.
CREATE OR REPLACE FUNCTION crm_ensure_default_stages()
RETURNS SETOF pipeline_stages
LANGUAGE plpgsql
SECURITY INVOKER
AS $fn$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'crm_ensure_default_stages requires an authenticated session';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE owner_id = uid) THEN
    INSERT INTO pipeline_stages (owner_id, name, position, color, kind, is_default)
    VALUES
      (uid, 'Prospect',          1,  '#9C8C78', 'open',    true),
      (uid, 'Qualified',         2,  '#8B7355', 'open',    true),
      (uid, 'Pitch Sent',        3,  '#7A6C9B', 'open',    true),
      (uid, 'Engaged',           4,  '#5C7A9B', 'open',    true),
      (uid, 'Meeting Scheduled', 5,  '#4A8B7C', 'open',    true),
      (uid, 'Due Diligence',     6,  '#3F7A5C', 'open',    true),
      (uid, 'Invested',          7,  '#2E6B4A', 'won',     true),
      (uid, 'Passed',            8,  '#A65D57', 'lost',    true),
      (uid, 'No Response',       9,  '#8A8580', 'dormant', true),
      (uid, 'Archived',          10, '#6E6A66', 'dormant', true);
  END IF;

  RETURN QUERY
    SELECT * FROM pipeline_stages WHERE owner_id = uid ORDER BY position;
END;
$fn$;

-- Exposed as an RPC to signed-in users only. SECURITY INVOKER above means RLS
-- still applies inside, so it can only ever seed the caller's own pipeline.
REVOKE ALL ON FUNCTION crm_ensure_default_stages() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm_ensure_default_stages() TO authenticated;

-- ---------------------------------------------------------------------------
-- crm_relationship_created — first stage entry and the opening event
-- ---------------------------------------------------------------------------
-- Every relationship starts its history the moment it exists, so time-in-stage
-- maths has a floor and the timeline is never empty on a page the founder just
-- opened.
CREATE OR REPLACE FUNCTION crm_relationship_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO relationship_stage_history
    (owner_id, relationship_id, from_stage_id, to_stage_id, duration_seconds, changed_at, changed_by)
  VALUES
    (NEW.owner_id, NEW.id, NULL, NEW.stage_id, NULL, NEW.created_at, auth.uid());

  INSERT INTO relationship_events
    (owner_id, relationship_id, event_type, summary, payload, occurred_at, created_by)
  VALUES
    (NEW.owner_id, NEW.id, 'INVESTOR_ADDED',
     NEW.investor_firm || ' added to the pipeline',
     jsonb_build_object(
       'campaign_id', NEW.campaign_id,
       'stage_id',    NEW.stage_id,
       'investor_firm', NEW.investor_firm
     ),
     NEW.created_at, auth.uid());

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS investor_relationships_created ON investor_relationships;
CREATE TRIGGER investor_relationships_created AFTER INSERT ON investor_relationships
  FOR EACH ROW EXECUTE FUNCTION crm_relationship_created();

-- ---------------------------------------------------------------------------
-- crm_relationship_stage_stamp — BEFORE update
-- ---------------------------------------------------------------------------
-- Sets stage_changed_at on the row itself so the AFTER trigger can read the
-- OLD value to compute how long the relationship sat in the stage it just
-- left. Splitting it this way keeps the duration honest even when the client
-- passes its own stage_changed_at, which is ignored.
CREATE OR REPLACE FUNCTION crm_relationship_stage_stamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    NEW.stage_changed_at = now();
  ELSE
    NEW.stage_changed_at = OLD.stage_changed_at;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS investor_relationships_stage_stamp ON investor_relationships;
CREATE TRIGGER investor_relationships_stage_stamp BEFORE UPDATE ON investor_relationships
  FOR EACH ROW EXECUTE FUNCTION crm_relationship_stage_stamp();

-- ---------------------------------------------------------------------------
-- crm_relationship_changed — AFTER update
-- ---------------------------------------------------------------------------
-- Records stage moves in both places they belong: the analytics table, with a
-- duration, and the timeline, with a readable summary. Also emits the
-- lifecycle events for archiving and for a move between campaigns.
--
-- Stage names are resolved here rather than at read time so a stage that is
-- later renamed does not rewrite what the timeline says happened.
CREATE OR REPLACE FUNCTION crm_relationship_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  from_name text;
  to_name   text;
  to_kind   crm_stage_kind;
  secs      integer;
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    SELECT name INTO from_name FROM pipeline_stages WHERE id = OLD.stage_id;
    SELECT name, kind INTO to_name, to_kind FROM pipeline_stages WHERE id = NEW.stage_id;

    secs := GREATEST(0, EXTRACT(EPOCH FROM (now() - OLD.stage_changed_at))::integer);

    INSERT INTO relationship_stage_history
      (owner_id, relationship_id, from_stage_id, to_stage_id, duration_seconds, changed_by)
    VALUES
      (NEW.owner_id, NEW.id, OLD.stage_id, NEW.stage_id, secs, auth.uid());

    INSERT INTO relationship_events
      (owner_id, relationship_id, event_type, summary, payload, created_by)
    VALUES
      (NEW.owner_id, NEW.id, 'STAGE_CHANGED',
       COALESCE(from_name, 'Unknown') || ' → ' || COALESCE(to_name, 'Unknown'),
       jsonb_build_object(
         'from_stage_id',    OLD.stage_id,
         'to_stage_id',      NEW.stage_id,
         'from_stage_name',  from_name,
         'to_stage_name',    to_name,
         'duration_seconds', secs
       ),
       auth.uid());

    -- A won or lost stage is also a business outcome, not just a column move.
    -- Emitting it separately means "how many passes did we take" is a single
    -- event_type filter rather than a join back to pipeline_stages.
    IF to_kind = 'won' THEN
      INSERT INTO relationship_events
        (owner_id, relationship_id, event_type, summary, payload, created_by)
      VALUES (NEW.owner_id, NEW.id, 'INVESTMENT_COMMITTED',
              NEW.investor_firm || ' committed',
              jsonb_build_object('stage_id', NEW.stage_id), auth.uid());
    ELSIF to_kind = 'lost' THEN
      INSERT INTO relationship_events
        (owner_id, relationship_id, event_type, summary, payload, created_by)
      VALUES (NEW.owner_id, NEW.id, 'PASS_RECEIVED',
              NEW.investor_firm || ' passed',
              jsonb_build_object('stage_id', NEW.stage_id), auth.uid());
    END IF;
  END IF;

  IF NEW.campaign_id IS DISTINCT FROM OLD.campaign_id THEN
    INSERT INTO relationship_events
      (owner_id, relationship_id, event_type, summary, payload, created_by)
    VALUES (NEW.owner_id, NEW.id, 'CAMPAIGN_CHANGED', 'Moved to another campaign',
            jsonb_build_object('from_campaign_id', OLD.campaign_id,
                               'to_campaign_id',   NEW.campaign_id), auth.uid());
  END IF;

  IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
    INSERT INTO relationship_events
      (owner_id, relationship_id, event_type, summary, payload, created_by)
    VALUES (NEW.owner_id, NEW.id, 'ARCHIVED', 'Relationship archived',
            '{}'::jsonb, auth.uid());
  END IF;

  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS investor_relationships_changed ON investor_relationships;
CREATE TRIGGER investor_relationships_changed AFTER UPDATE ON investor_relationships
  FOR EACH ROW EXECUTE FUNCTION crm_relationship_changed();

-- ---------------------------------------------------------------------------
-- crm_event_touches_relationship
-- ---------------------------------------------------------------------------
-- last_interaction_at drives the "gone quiet" surfaces on the dashboard, so it
-- has to reflect every event without the caller remembering to update it.
--
-- Only genuine contact counts. A note or a task being created is bookkeeping,
-- not an interaction with the investor, and letting it reset the clock would
-- hide exactly the relationships the dashboard exists to surface.
--
-- The guard against moving the timestamp backwards matters because events are
-- back-datable: logging a call from last Tuesday must not make a relationship
-- look staler than it is.
CREATE OR REPLACE FUNCTION crm_event_touches_relationship()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.event_type IN (
    'INVESTOR_ADDED', 'NOTE_ADDED', 'TASK_CREATED', 'TASK_COMPLETED',
    'PITCH_GENERATED', 'PITCH_REGENERATED', 'STAGE_CHANGED',
    'CAMPAIGN_CHANGED', 'ARCHIVED',
    'SEQUENCE_STARTED', 'SEQUENCE_PAUSED', 'SEQUENCE_RESUMED', 'SEQUENCE_STOPPED'
  ) THEN
    RETURN NULL;
  END IF;

  UPDATE investor_relationships
     SET last_interaction_at = GREATEST(
           COALESCE(last_interaction_at, NEW.occurred_at), NEW.occurred_at)
   WHERE id = NEW.relationship_id;

  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS relationship_events_touch_parent ON relationship_events;
CREATE TRIGGER relationship_events_touch_parent AFTER INSERT ON relationship_events
  FOR EACH ROW EXECUTE FUNCTION crm_event_touches_relationship();

-- ---------------------------------------------------------------------------
-- crm_note_to_event
-- ---------------------------------------------------------------------------
-- Notes stay editable in their own table; the timeline gets an immutable marker
-- that one was written, carrying a short excerpt so the feed reads without a
-- join. Editing a note later does not rewrite the event, which is the intended
-- behaviour for an audit trail.
CREATE OR REPLACE FUNCTION crm_note_to_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO relationship_events
    (owner_id, relationship_id, event_type, summary, payload, is_manual, occurred_at, created_by)
  VALUES
    (NEW.owner_id, NEW.relationship_id, 'NOTE_ADDED',
     left(NEW.body, 140),
     jsonb_build_object('note_id', NEW.id),
     true, NEW.created_at, NEW.created_by);
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS relationship_notes_to_event ON relationship_notes;
CREATE TRIGGER relationship_notes_to_event AFTER INSERT ON relationship_notes
  FOR EACH ROW EXECUTE FUNCTION crm_note_to_event();

-- ---------------------------------------------------------------------------
-- crm_meeting_to_event
-- ---------------------------------------------------------------------------
-- Scheduling and completing a meeting are two distinct facts on the timeline,
-- and the second is what conversion analytics counts.
CREATE OR REPLACE FUNCTION crm_meeting_to_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO relationship_events
      (owner_id, relationship_id, event_type, summary, payload, occurred_at, created_by)
    VALUES
      (NEW.owner_id, NEW.relationship_id, 'MEETING_SCHEDULED',
       COALESCE(NEW.title, 'Meeting scheduled'),
       jsonb_build_object('meeting_id', NEW.id, 'scheduled_at', NEW.scheduled_at,
                          'meeting_type', NEW.meeting_type),
       NEW.created_at, auth.uid());
    RETURN NULL;
  END IF;

  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    INSERT INTO relationship_events
      (owner_id, relationship_id, event_type, summary, payload, occurred_at, created_by)
    VALUES
      (NEW.owner_id, NEW.relationship_id, 'MEETING_COMPLETED',
       COALESCE(NEW.outcome, NEW.title, 'Meeting completed'),
       jsonb_build_object('meeting_id', NEW.id, 'outcome', NEW.outcome),
       NEW.completed_at, auth.uid());
  END IF;

  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS relationship_meetings_to_event ON relationship_meetings;
CREATE TRIGGER relationship_meetings_to_event
  AFTER INSERT OR UPDATE ON relationship_meetings
  FOR EACH ROW EXECUTE FUNCTION crm_meeting_to_event();

-- ---------------------------------------------------------------------------
-- crm_task_completion
-- ---------------------------------------------------------------------------
-- Stamps completed_at when a task flips to completed, and clears it if the
-- founder reopens one — the client only has to set status.
CREATE OR REPLACE FUNCTION crm_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS tasks_completion ON tasks;
CREATE TRIGGER tasks_completion BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION crm_task_completion();

-- ---------------------------------------------------------------------------
-- crm_email_to_event
-- ---------------------------------------------------------------------------
-- A sent email is the single most common thing on a timeline. Logged here so
-- that any path which records a send — the app, a sequence runner, a webhook
-- replay — produces the same event without duplicating the logic.
CREATE OR REPLACE FUNCTION crm_email_to_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  kind crm_event_type;
BEGIN
  kind := CASE NEW.email_type
            WHEN 'followup'      THEN 'FOLLOWUP_SENT'
            WHEN 'sequence_step' THEN 'FOLLOWUP_SENT'
            ELSE 'EMAIL_SENT'
          END::crm_event_type;

  INSERT INTO relationship_events
    (owner_id, relationship_id, event_type, summary, payload, occurred_at, created_by)
  VALUES
    (NEW.owner_id, NEW.relationship_id, kind, NEW.subject,
     jsonb_build_object('sent_email_id', NEW.id, 'to_email', NEW.to_email,
                        'email_type', NEW.email_type),
     NEW.sent_at, auth.uid());

  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS sent_emails_to_event ON sent_emails;
CREATE TRIGGER sent_emails_to_event AFTER INSERT ON sent_emails
  FOR EACH ROW EXECUTE FUNCTION crm_email_to_event();

-- ---------------------------------------------------------------------------
-- crm_email_engagement
-- ---------------------------------------------------------------------------
-- Opens and replies arrive later, usually from a Resend webhook running as
-- service role. Turning those column updates into events here means the
-- webhook handler stays a thin write.
CREATE OR REPLACE FUNCTION crm_email_engagement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.opened_at IS NOT NULL AND OLD.opened_at IS NULL THEN
    INSERT INTO relationship_events
      (owner_id, relationship_id, event_type, summary, payload, occurred_at)
    VALUES (NEW.owner_id, NEW.relationship_id, 'EMAIL_OPENED',
            'Opened: ' || NEW.subject,
            jsonb_build_object('sent_email_id', NEW.id), NEW.opened_at);
  END IF;

  IF NEW.replied_at IS NOT NULL AND OLD.replied_at IS NULL THEN
    INSERT INTO relationship_events
      (owner_id, relationship_id, event_type, summary, payload, occurred_at)
    VALUES (NEW.owner_id, NEW.relationship_id, 'REPLIED',
            'Replied to: ' || NEW.subject,
            jsonb_build_object('sent_email_id', NEW.id), NEW.replied_at);
  END IF;

  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS sent_emails_engagement ON sent_emails;
CREATE TRIGGER sent_emails_engagement AFTER UPDATE ON sent_emails
  FOR EACH ROW EXECUTE FUNCTION crm_email_engagement();
