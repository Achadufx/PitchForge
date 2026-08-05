-- ============================================================================
-- PitchWire CRM — Phase 1 core schema
-- ============================================================================
-- Run this in the Supabase SQL editor, or via `supabase db push` if you adopt
-- the CLI later. It is written to be re-runnable: every object is created with
-- IF NOT EXISTS or guarded by a DO block, so a partial apply can be repeated
-- safely.
--
-- OWNERSHIP MODEL
-- Every table carries `owner_id` referencing auth.users, and RLS is enforced on
-- that column. Multi-founder teams are a later migration: add `workspace_id`,
-- backfill it from owner_id, then swap the policies to check workspace
-- membership. Nothing in the application reads owner_id directly for logic —
-- it exists for isolation — so that swap stays contained to this file.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
-- Event types are an enum rather than free text so analytics cannot rot into
-- 'reply' / 'replied' / 'reply_received' variants of the same fact. Adding a
-- value later is `ALTER TYPE ... ADD VALUE`, which is cheap and non-blocking.

DO $$ BEGIN
  CREATE TYPE crm_event_type AS ENUM (
    'INVESTOR_ADDED',
    'PITCH_GENERATED',
    'PITCH_REGENERATED',
    'EMAIL_SENT',
    'EMAIL_OPENED',
    'FOLLOWUP_SENT',
    'REPLIED',
    'MEETING_SCHEDULED',
    'MEETING_COMPLETED',
    'CALL_LOGGED',
    'DEMO_GIVEN',
    'WARM_INTRO',
    'STAGE_CHANGED',
    'CAMPAIGN_CHANGED',
    'NOTE_ADDED',
    'TASK_CREATED',
    'TASK_COMPLETED',
    'INVESTMENT_COMMITTED',
    'PASS_RECEIVED',
    'SEQUENCE_STARTED',
    'SEQUENCE_PAUSED',
    'SEQUENCE_RESUMED',
    'SEQUENCE_STOPPED',
    'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_campaign_status AS ENUM ('active', 'paused', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_relationship_status AS ENUM ('active', 'snoozed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_email_type AS ENUM (
    'initial_pitch', 'followup', 'sequence_step', 'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_task_type AS ENUM (
    'followup', 'review_pitch', 'send_followup', 'prepare_meeting',
    'call_investor', 'send_deck', 'upload_document', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_task_status AS ENUM ('pending', 'completed', 'snoozed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_stage_kind AS ENUM ('open', 'won', 'lost', 'dormant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Shared trigger function: keep updated_at honest
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
