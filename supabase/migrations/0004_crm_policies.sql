-- ============================================================================
-- PitchWire CRM — Row Level Security
-- Depends on 0002_crm_tables.sql and 0003_crm_timeline.sql.
-- ============================================================================
-- Every CRM table carries owner_id, so every policy is the same shape:
-- owner_id = auth.uid(). That uniformity is the point — there is no table where
-- a subtle join makes the rule different, and nothing is readable without a
-- session. The service role bypasses RLS entirely, which is why it is confined
-- to trusted backend jobs (cron, Resend webhooks, sequence execution) and never
-- reaches a request that carries a user's input.
--
-- Policies are dropped and recreated rather than guarded with IF NOT EXISTS
-- (which Postgres does not support for CREATE POLICY), keeping the file
-- re-runnable.
-- ============================================================================

ALTER TABLE pipeline_stages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_relationships    ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_pitches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_emails               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_meetings     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Standard owner policies
-- ---------------------------------------------------------------------------
-- Generated in a loop so no table can quietly drift out of the pattern, and so
-- adding a CRM table later is one line in this array rather than four hand
-- written policies that might disagree with each other.
DO $$
DECLARE
  t text;
  crm_tables text[] := ARRAY[
    'pipeline_stages',
    'campaigns',
    'investor_relationships',
    'generated_pitches',
    'sent_emails',
    'tasks',
    'relationship_notes',
    'relationship_meetings'
  ];
BEGIN
  FOREACH t IN ARRAY crm_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete_own', t);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (owner_id = auth.uid())',
      t || '_select_own', t
    );
    -- WITH CHECK on insert stops a client from writing a row owned by someone
    -- else; without it, RLS would allow the insert and then hide the row.
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid())',
      t || '_insert_own', t
    );
    -- Both clauses: USING picks which rows may be updated, WITH CHECK stops the
    -- update from reassigning owner_id to another user on the way out.
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated '
      'USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())',
      t || '_update_own', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (owner_id = auth.uid())',
      t || '_delete_own', t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Append-only tables
-- ---------------------------------------------------------------------------
-- The timeline and stage history are the audit record. Clients may read and
-- append; they may not rewrite or erase history. Corrections are new events,
-- and any genuine repair is a backend job running as service role.
DROP POLICY IF EXISTS relationship_events_select_own ON relationship_events;
CREATE POLICY relationship_events_select_own ON relationship_events
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS relationship_events_insert_own ON relationship_events;
CREATE POLICY relationship_events_insert_own ON relationship_events
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS relationship_stage_history_select_own ON relationship_stage_history;
CREATE POLICY relationship_stage_history_select_own ON relationship_stage_history
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- No insert policy for stage history at all: rows are written only by the
-- trigger in 0005, which runs SECURITY DEFINER and therefore bypasses RLS. A
-- client cannot fabricate a stage transition it did not make.
