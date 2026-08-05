-- ============================================================================
-- PitchWire CRM — Phase 1 tables
-- Depends on 0001_crm_core.sql (enums + crm_touch_updated_at).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- pipeline_stages
-- ---------------------------------------------------------------------------
-- Stages are rows, not a hardcoded enum on the relationship. That buys
-- user-configurable pipelines, drag-and-drop reordering, per-stage colour, and
-- stage analytics without a schema migration every time a founder wants a new
-- column on their board.
--
-- `kind` classifies a stage for analytics that must survive renaming: a founder
-- can rename "Invested" to "Closed" and conversion maths still works because it
-- keys off kind = 'won', not the label.
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  position    integer NOT NULL,
  color       text NOT NULL DEFAULT '#8B7355',
  kind        crm_stage_kind NOT NULL DEFAULT 'open',
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_stages_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS pipeline_stages_owner_position_idx
  ON pipeline_stages (owner_id, position);
CREATE INDEX IF NOT EXISTS pipeline_stages_owner_idx
  ON pipeline_stages (owner_id);

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
-- A campaign is one fundraising effort: "Pre-Seed 2026", "Seed 2027". It is an
-- analytics container. Day-to-day work happens on the relationships inside it.
CREATE TABLE IF NOT EXISTS campaigns (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  goal           text,
  target_amount  numeric(14,2),
  currency       text NOT NULL DEFAULT 'USD',
  status         crm_campaign_status NOT NULL DEFAULT 'active',
  notes          text,
  started_at     timestamptz,
  closed_at      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT campaigns_target_non_negative
    CHECK (target_amount IS NULL OR target_amount >= 0)
);

CREATE INDEX IF NOT EXISTS campaigns_owner_status_idx
  ON campaigns (owner_id, status);

DROP TRIGGER IF EXISTS campaigns_touch ON campaigns;
CREATE TRIGGER campaigns_touch BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION crm_touch_updated_at();

DROP TRIGGER IF EXISTS pipeline_stages_touch ON pipeline_stages;
CREATE TRIGGER pipeline_stages_touch BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION crm_touch_updated_at();

-- ---------------------------------------------------------------------------
-- investor_relationships — the source of truth
-- ---------------------------------------------------------------------------
-- One row per (campaign, investor). Pitching the same investor in a later raise
-- creates a NEW relationship in that campaign, so each raise keeps its own
-- timeline and the investor's history across raises stays legible.
--
-- investor_id is added in a DO block below because the existing `investors`
-- table predates this migration and its id may be uuid or bigint; the column is
-- created to match whatever is actually there, so the FK is real either way.
CREATE TABLE IF NOT EXISTS investor_relationships (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id          uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  stage_id             uuid NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  status               crm_relationship_status NOT NULL DEFAULT 'active',

  -- Denormalised contact snapshot. The investors table is a shared directory and
  -- can change under the founder; these fields record who was actually pitched.
  investor_firm        text NOT NULL,
  investor_contact     text,
  investor_email       text,

  tags                 text[] NOT NULL DEFAULT '{}',
  relationship_score   integer,
  next_followup_at     timestamptz,
  last_interaction_at  timestamptz,
  stage_changed_at     timestamptz NOT NULL DEFAULT now(),
  archived_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT investor_relationships_firm_not_blank
    CHECK (length(btrim(investor_firm)) > 0),
  CONSTRAINT investor_relationships_score_range
    CHECK (relationship_score IS NULL OR relationship_score BETWEEN 0 AND 100)
);

DROP TRIGGER IF EXISTS investor_relationships_touch ON investor_relationships;
CREATE TRIGGER investor_relationships_touch BEFORE UPDATE ON investor_relationships
  FOR EACH ROW EXECUTE FUNCTION crm_touch_updated_at();

-- Link to the shared investor directory, typed to match whatever `investors.id`
-- actually is. The column is nullable: a founder can track an investor that is
-- not in the directory at all, and the directory row may later be deleted
-- without destroying the relationship history (ON DELETE SET NULL).
DO $$
DECLARE
  investors_id_type text;
BEGIN
  SELECT data_type INTO investors_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'investors' AND column_name = 'id';

  IF investors_id_type IS NULL THEN
    RAISE NOTICE 'investors table not found; skipping investor_id FK';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'investor_relationships'
      AND column_name = 'investor_id'
  ) THEN
    EXECUTE format(
      'ALTER TABLE investor_relationships ADD COLUMN investor_id %s',
      CASE investors_id_type
        WHEN 'uuid' THEN 'uuid'
        WHEN 'bigint' THEN 'bigint'
        WHEN 'integer' THEN 'integer'
        ELSE 'text'
      END
    );
    EXECUTE
      'ALTER TABLE investor_relationships '
      'ADD CONSTRAINT investor_relationships_investor_fk '
      'FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE SET NULL';
  END IF;
END $$;

-- One live relationship per investor per campaign. Partial on archived_at so a
-- founder can archive a relationship and start a fresh one in the same campaign
-- without tripping the constraint.
CREATE UNIQUE INDEX IF NOT EXISTS investor_relationships_campaign_investor_idx
  ON investor_relationships (campaign_id, investor_id)
  WHERE investor_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS investor_relationships_owner_stage_idx
  ON investor_relationships (owner_id, stage_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS investor_relationships_campaign_idx
  ON investor_relationships (campaign_id) WHERE archived_at IS NULL;
-- Drives the "overdue / upcoming follow-ups" dashboard queries.
CREATE INDEX IF NOT EXISTS investor_relationships_followup_idx
  ON investor_relationships (owner_id, next_followup_at)
  WHERE next_followup_at IS NOT NULL AND archived_at IS NULL;
