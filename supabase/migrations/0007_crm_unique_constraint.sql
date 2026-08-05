-- ============================================================================
-- PitchWire CRM — 0007: the investor-count fix, stage keys, and dedupe guards
-- Depends on 0001–0006. Re-runnable.
-- ============================================================================
--
-- READ THIS BEFORE RUNNING. The reported symptom was "the investor count goes
-- up every time I do anything". The cause was NOT duplicate rows in
-- investor_relationships — it was section 1 below, a missing DISTINCT in the
-- campaign_stats view. Sections 2–5 harden the rest of the pipeline so the
-- count cannot drift for the other, real reasons either.
--
--   1. campaign_stats.total_investors was inflated by every timeline event
--   2. pipeline_stages gains a stable `stage_key` so automation survives renames
--   3. investor_relationships gains the unique indexes it never had
--   4. sent_emails drives stage transitions automatically
--   5. indexes the follow-up and cron queries need
--
-- Sections 3 merges duplicate rows. It re-parents every child row onto the
-- survivor first, so no timeline, note, task, meeting, email or pitch is lost.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. THE BUG: campaign_stats counted relationships once per event
-- ---------------------------------------------------------------------------
-- The view LEFT JOINs relationship_events, which fans each relationship out to
-- one row per event. `count(r.id)` then counted that fan-out, so a founder who
-- added a note, moved a stage and sent an email saw one investor reported as
-- four. Every non-DISTINCT count over `r` had the same defect.
--
-- count(e.id) and count(DISTINCT e.relationship_id) were always correct — each
-- result row corresponds to exactly one event — so only the `r` counts change.
--
-- Two columns are new. Opens and time-to-reply live on sent_emails, and joining
-- that table into the main query would fan the rows out a second time and break
-- the per-event counts — so they are aggregated separately and joined one row
-- per campaign.
--
-- Dropped and recreated rather than CREATE OR REPLACE: replace cannot insert a
-- column into the middle of a view's column list, and putting the two new
-- figures beside the counts they belong with is worth a drop. Nothing depends
-- on this view, so there is nothing to cascade.
DROP VIEW IF EXISTS campaign_stats;

CREATE VIEW campaign_stats
WITH (security_invoker = true) AS
WITH first_touch AS (
  -- One row per relationship: when the thread opened, when they first wrote
  -- back, and whether anything in it was ever opened.
  SELECT
    relationship_id,
    min(sent_at)                       AS first_sent_at,
    min(replied_at)                    AS first_replied_at,
    bool_or(opened_at IS NOT NULL)     AS ever_opened
  FROM sent_emails
  GROUP BY relationship_id
),
mail AS (
  SELECT
    r.campaign_id,
    count(*) FILTER (WHERE f.ever_opened)                    AS investors_opened,
    -- Average over relationships, not over emails: an investor who got five
    -- nudges before replying should count once, not five times. Negative
    -- intervals are excluded rather than clamped — they mean a clock or an
    -- imported timestamp is wrong, and averaging bad data in hides that.
    avg(EXTRACT(epoch FROM (f.first_replied_at - f.first_sent_at)) / 86400.0)
      FILTER (WHERE f.first_replied_at IS NOT NULL
                AND f.first_replied_at >= f.first_sent_at)   AS avg_days_to_first_reply
  FROM first_touch f
  JOIN investor_relationships r ON r.id = f.relationship_id
  WHERE r.archived_at IS NULL
  GROUP BY r.campaign_id
)
SELECT
  c.id                       AS campaign_id,
  c.owner_id,
  c.name,
  c.status,
  c.target_amount,
  c.currency,

  count(DISTINCT r.id) FILTER (WHERE r.archived_at IS NULL)
                                                                    AS total_investors,
  count(DISTINCT r.id) FILTER (WHERE r.archived_at IS NULL AND s.kind = 'won')
                                                                    AS investments,
  count(DISTINCT r.id) FILTER (WHERE r.archived_at IS NULL AND s.kind = 'lost')
                                                                    AS passes,

  count(DISTINCT e.relationship_id)
    FILTER (WHERE e.event_type IN ('EMAIL_SENT', 'FOLLOWUP_SENT'))  AS investors_emailed,
  count(DISTINCT e.relationship_id)
    FILTER (WHERE e.event_type = 'REPLIED')                         AS investors_replied,
  count(DISTINCT e.relationship_id)
    FILTER (WHERE e.event_type IN ('MEETING_SCHEDULED', 'MEETING_COMPLETED'))
                                                                    AS investors_met,

  coalesce(mail.investors_opened, 0)                                AS investors_opened,
  round(mail.avg_days_to_first_reply::numeric, 1)                   AS avg_days_to_first_reply,

  count(e.id) FILTER (WHERE e.event_type IN ('EMAIL_SENT', 'FOLLOWUP_SENT')) AS emails_sent,
  count(e.id) FILTER (WHERE e.event_type IN ('PITCH_GENERATED', 'PITCH_REGENERATED'))
                                                                    AS pitches_generated,

  max(e.occurred_at)                                                AS last_activity_at
FROM campaigns c
LEFT JOIN investor_relationships r ON r.campaign_id = c.id
LEFT JOIN pipeline_stages       s ON s.id = r.stage_id
LEFT JOIN relationship_events   e ON e.relationship_id = r.id
LEFT JOIN mail                    ON mail.campaign_id = c.id
GROUP BY c.id, c.owner_id, c.name, c.status, c.target_amount, c.currency,
         mail.investors_opened, mail.avg_days_to_first_reply;

COMMENT ON VIEW campaign_stats IS
  'Per-campaign funnel aggregates. Relationship counts are DISTINCT because the '
  'events join fans each relationship out to one row per event. Open and '
  'time-to-reply figures are aggregated from sent_emails separately so that '
  'join cannot fan the rows out again. Rates are derived in the application '
  'from investors_emailed as the denominator.';


-- ---------------------------------------------------------------------------
-- 2. stage_key — a stable handle on a user-renameable stage
-- ---------------------------------------------------------------------------
-- Stages are rows a founder can rename, reorder and delete, so no automation
-- can key off `name`. `kind` is too coarse: six of the ten defaults are 'open'.
-- stage_key is the missing middle — set on the seeded stages, NULL on anything
-- the founder creates themselves.
--
-- NULL is meaningful: it means "this stage has no automation semantics", and
-- every routine below treats a NULL key as "leave this relationship alone".
-- A founder with a hand-built pipeline gets no surprise moves.
ALTER TABLE pipeline_stages
  ADD COLUMN IF NOT EXISTS stage_key text;

DO $$ BEGIN
  ALTER TABLE pipeline_stages
    ADD CONSTRAINT pipeline_stages_stage_key_allowed
    CHECK (stage_key IS NULL OR stage_key IN (
      'prospect', 'qualified', 'pitch_sent', 'engaged', 'meeting',
      'diligence', 'invested', 'passed', 'no_response', 'archived'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS pipeline_stages_owner_key_idx
  ON pipeline_stages (owner_id, stage_key) WHERE stage_key IS NOT NULL;

-- Backfill by matching the names 0005 seeded. Only rows still carrying
-- is_default are touched, so a renamed stage is left alone rather than
-- re-keyed against the founder's intent.
UPDATE pipeline_stages SET stage_key = CASE lower(btrim(name))
    WHEN 'prospect'          THEN 'prospect'
    WHEN 'qualified'         THEN 'qualified'
    WHEN 'pitch sent'        THEN 'pitch_sent'
    WHEN 'engaged'           THEN 'engaged'
    WHEN 'meeting scheduled' THEN 'meeting'
    WHEN 'due diligence'     THEN 'diligence'
    WHEN 'invested'          THEN 'invested'
    WHEN 'passed'            THEN 'passed'
    WHEN 'no response'       THEN 'no_response'
    WHEN 'archived'          THEN 'archived'
  END
WHERE stage_key IS NULL
  AND is_default
  AND lower(btrim(name)) IN (
    'prospect', 'qualified', 'pitch sent', 'engaged', 'meeting scheduled',
    'due diligence', 'invested', 'passed', 'no response', 'archived'
  );

-- Reseed with the key attached, so new founders get it from day one.
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
    INSERT INTO pipeline_stages (owner_id, name, position, color, kind, is_default, stage_key)
    VALUES
      (uid, 'Prospect',          1,  '#9C8C78', 'open',    true, 'prospect'),
      (uid, 'Qualified',         2,  '#8B7355', 'open',    true, 'qualified'),
      (uid, 'Pitch Sent',        3,  '#7A6C9B', 'open',    true, 'pitch_sent'),
      (uid, 'Engaged',           4,  '#5C7A9B', 'open',    true, 'engaged'),
      (uid, 'Meeting Scheduled', 5,  '#4A8B7C', 'open',    true, 'meeting'),
      (uid, 'Due Diligence',     6,  '#3F7A5C', 'open',    true, 'diligence'),
      (uid, 'Invested',          7,  '#2E6B4A', 'won',     true, 'invested'),
      (uid, 'Passed',            8,  '#A65D57', 'lost',    true, 'passed'),
      (uid, 'No Response',       9,  '#8A8580', 'dormant', true, 'no_response'),
      (uid, 'Archived',          10, '#6E6A66', 'dormant', true, 'archived');
  END IF;

  RETURN QUERY
    SELECT * FROM pipeline_stages WHERE owner_id = uid ORDER BY position;
END;
$fn$;

REVOKE ALL ON FUNCTION crm_ensure_default_stages() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm_ensure_default_stages() TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. One relationship per investor per campaign — enforced, finally
-- ---------------------------------------------------------------------------
-- 0002 created a unique index on (campaign_id, investor_id), but only WHERE
-- investor_id IS NOT NULL. The pitch flow never sets investor_id — send-pitches
-- has a firm and an email, not a directory id — so every relationship the
-- product actually creates was unprotected. lib/crm/ingest.ts guarded it in
-- application code, which loses to a concurrent batch or a double-clicked send.
--
-- The key is the email when there is one and the firm when there is not. Two
-- partners at the same firm reached at two addresses are genuinely two threads;
-- a firm pitched twice with no named contact is one.

-- 3a. Merge existing duplicates onto the survivor.
--
-- The survivor is the most recently updated row. Children are re-parented
-- before the loser is deleted, because deleting first would cascade and take
-- the timeline with it — the exact history the CRM exists to keep.
DO $merge$
DECLARE
  dup RECORD;
  child text;
  moved integer := 0;
BEGIN
  FOR dup IN
    WITH ranked AS (
      SELECT
        id,
        first_value(id) OVER w AS keep_id,
        row_number()    OVER w AS rn
      FROM investor_relationships
      WHERE archived_at IS NULL
      WINDOW w AS (
        PARTITION BY
          campaign_id,
          CASE
            WHEN nullif(btrim(investor_email), '') IS NOT NULL
              THEN 'e:' || lower(btrim(investor_email))
            ELSE 'f:' || lower(btrim(investor_firm))
          END
        ORDER BY updated_at DESC, created_at DESC, id
      )
    )
    SELECT id, keep_id FROM ranked WHERE rn > 1
  LOOP
    FOREACH child IN ARRAY ARRAY[
      'relationship_events', 'relationship_notes', 'tasks',
      'relationship_meetings', 'sent_emails', 'generated_pitches',
      'relationship_stage_history'
    ] LOOP
      IF to_regclass('public.' || child) IS NOT NULL THEN
        EXECUTE format(
          'UPDATE %I SET relationship_id = $1 WHERE relationship_id = $2', child
        ) USING dup.keep_id, dup.id;
      END IF;
    END LOOP;

    DELETE FROM investor_relationships WHERE id = dup.id;
    moved := moved + 1;
  END LOOP;

  IF moved > 0 THEN
    RAISE NOTICE 'merged % duplicate relationship(s) into their survivors', moved;
  ELSE
    RAISE NOTICE 'no duplicate relationships found';
  END IF;
END $merge$;

-- 3b. The guards themselves. Partial on archived_at so archiving a
-- relationship frees the investor to be re-added to the same campaign, which
-- is the behaviour 0002 already documented and the app's PATCH relies on.
CREATE UNIQUE INDEX IF NOT EXISTS investor_relationships_campaign_email_idx
  ON investor_relationships (campaign_id, lower(btrim(investor_email)))
  WHERE archived_at IS NULL AND nullif(btrim(investor_email), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS investor_relationships_campaign_firm_idx
  ON investor_relationships (campaign_id, lower(btrim(investor_firm)))
  WHERE archived_at IS NULL AND nullif(btrim(investor_email), '') IS NULL;


-- ---------------------------------------------------------------------------
-- 4. Stage transitions that follow the email, not the founder's memory
-- ---------------------------------------------------------------------------
-- Sending, opening and replying are facts the system already knows. Making the
-- founder drag a card to record them is how a CRM goes stale in week two.
--
-- Every move here goes through a plain UPDATE on investor_relationships, so the
-- existing 0005 triggers write the STAGE_CHANGED event and the stage-history
-- row exactly as they do for a manual move. Nothing about the timeline knows
-- this was automatic.
--
-- The rules only ever move a relationship forward, and only from a stage whose
-- stage_key says what it means. A founder who has moved someone to Due
-- Diligence never gets dragged back to Pitch Sent by a late webhook.

CREATE OR REPLACE FUNCTION crm_advance_stage(
  rel_id uuid,
  from_keys text[],
  to_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  rel_owner   uuid;
  current_key text;
  target_id   uuid;
BEGIN
  SELECT r.owner_id, s.stage_key
    INTO rel_owner, current_key
    FROM investor_relationships r
    JOIN pipeline_stages s ON s.id = r.stage_id
   WHERE r.id = rel_id AND r.archived_at IS NULL;

  -- No row, or a stage the founder built themselves. Either way: hands off.
  IF rel_owner IS NULL OR current_key IS NULL THEN
    RETURN false;
  END IF;

  IF NOT (current_key = ANY (from_keys)) THEN
    RETURN false;
  END IF;

  SELECT id INTO target_id
    FROM pipeline_stages
   WHERE owner_id = rel_owner AND stage_key = to_key;

  -- The founder deleted the target stage. Skipping is the only honest option;
  -- inventing a stage would put a card somewhere they never asked for.
  IF target_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE investor_relationships SET stage_id = target_id WHERE id = rel_id;
  RETURN true;
END;
$fn$;

-- Granted to service_role so the nightly no-response sweep can reuse the same
-- never-downgrade logic instead of reimplementing it in JavaScript, where it
-- would drift. Not granted to `authenticated`: a founder moving a card goes
-- through the API's PATCH, which has its own authorisation.
REVOKE ALL ON FUNCTION crm_advance_stage(uuid, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm_advance_stage(uuid, text[], text) TO service_role;

-- 4a. A send moves Prospect / Qualified → Pitch Sent.
CREATE OR REPLACE FUNCTION crm_email_sent_advances_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM crm_advance_stage(
    NEW.relationship_id, ARRAY['prospect', 'qualified'], 'pitch_sent'
  );
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS sent_emails_advance_stage ON sent_emails;
CREATE TRIGGER sent_emails_advance_stage AFTER INSERT ON sent_emails
  FOR EACH ROW EXECUTE FUNCTION crm_email_sent_advances_stage();

-- 4b. An open moves Pitch Sent → Engaged. A reply moves anything still in the
-- outreach half of the pipeline → Engaged, including No Response: a late reply
-- is exactly the signal that should pull someone back into play.
CREATE OR REPLACE FUNCTION crm_email_engagement_advances_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.replied_at IS NOT NULL AND OLD.replied_at IS NULL THEN
    PERFORM crm_advance_stage(
      NEW.relationship_id,
      ARRAY['prospect', 'qualified', 'pitch_sent', 'no_response'],
      'engaged'
    );
  ELSIF NEW.opened_at IS NOT NULL AND OLD.opened_at IS NULL THEN
    PERFORM crm_advance_stage(NEW.relationship_id, ARRAY['pitch_sent'], 'engaged');
  END IF;

  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS sent_emails_engagement_stage ON sent_emails;
CREATE TRIGGER sent_emails_engagement_stage AFTER UPDATE ON sent_emails
  FOR EACH ROW EXECUTE FUNCTION crm_email_engagement_advances_stage();


-- ---------------------------------------------------------------------------
-- 5. Indexes for the follow-up queue and the no-response sweep
-- ---------------------------------------------------------------------------
-- The follow-up queue asks "who is in Pitch Sent, and when did I last email
-- them"; the nightly sweep asks the same question with a 14-day floor. Both
-- walk sent_emails by relationship and date, and both need the engagement
-- columns to decide whether silence is real.
CREATE INDEX IF NOT EXISTS sent_emails_relationship_sent_idx
  ON sent_emails (relationship_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS sent_emails_owner_engagement_idx
  ON sent_emails (owner_id, sent_at DESC)
  WHERE opened_at IS NULL AND replied_at IS NULL;

CREATE INDEX IF NOT EXISTS sent_emails_provider_message_idx
  ON sent_emails (provider_message_id) WHERE provider_message_id IS NOT NULL;

-- The board and the detail panel both order by updated_at within an owner.
CREATE INDEX IF NOT EXISTS investor_relationships_owner_updated_idx
  ON investor_relationships (owner_id, updated_at DESC) WHERE archived_at IS NULL;

-- Case-insensitive lookup is how ingest finds an existing relationship before
-- inserting; without these it was a sequential scan per pitch in a batch.
CREATE INDEX IF NOT EXISTS investor_relationships_email_lookup_idx
  ON investor_relationships (campaign_id, lower(btrim(investor_email)))
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS investor_relationships_firm_lookup_idx
  ON investor_relationships (campaign_id, lower(btrim(investor_firm)))
  WHERE archived_at IS NULL;

-- The timeline reads newest-first per relationship on every panel open.
CREATE INDEX IF NOT EXISTS relationship_events_relationship_occurred_idx
  ON relationship_events (relationship_id, occurred_at DESC);
