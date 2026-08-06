-- ===========================================================================
-- 0008 — Gmail connections
-- ===========================================================================
-- Resend tells us when a pitch was delivered and when it was opened. It cannot
-- tell us when an investor replied: the reply goes to the founder's own inbox
-- and never touches Resend at all. That gap is why reply_rate reads 0% for
-- founders who are actually getting answers, and it is what this table closes.
--
-- One row per founder, holding an OAuth grant against their Gmail with the
-- read-only scope. /api/gmail/sync searches that mailbox for mail FROM the
-- addresses they have pitched and stamps sent_emails.replied_at. Everything
-- downstream — the REPLIED timeline event, the move to Engaged — is already
-- driven by the triggers in 0005 and 0007, so this migration adds storage and
-- nothing else.
--
-- SECURITY NOTE
-- These rows hold live OAuth tokens. A refresh token is a standing key to the
-- founder's mailbox, so this table gets two layers rather than one:
--
--   1. RLS, so no founder can reach another founder's row at all.
--   2. Column privileges, so even the founder's OWN browser session cannot
--      SELECT the token columns. The anon key runs as `authenticated`, and a
--      plain RLS policy would happily return the tokens to any JavaScript on
--      the page — including anything injected into it. Only the service role,
--      which lives on the server, can read them.
--
-- The tokens are additionally encrypted at rest by lib/gmail.js before they
-- ever reach Postgres (AES-256-GCM under GMAIL_TOKEN_KEY), so a database dump
-- without that key yields ciphertext.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS gmail_connections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL,
  access_token   text NOT NULL,
  refresh_token  text NOT NULL,
  token_expiry   timestamptz,
  last_synced_at timestamptz,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (owner_id)
);

-- Set when Google revokes the grant (password change, user removed the app in
-- their Google account, refresh token expired). The cron skips these instead of
-- retrying a grant that will never work again, and the Account tab shows
-- "reconnect" rather than a silent zero.
ALTER TABLE gmail_connections
  ADD COLUMN IF NOT EXISTS sync_error text;

ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gmail_own ON gmail_connections;
CREATE POLICY gmail_own ON gmail_connections
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Column privileges — the second layer
-- ---------------------------------------------------------------------------
-- Supabase grants `authenticated` full table access by default and leaves the
-- filtering to RLS. That is right for a pipeline row and wrong for a bearer
-- token: RLS scopes the rows, not the columns, so the founder's own session
-- could read its own access_token straight out of the browser.
--
-- Writes go through the API routes under the service role, so `authenticated`
-- needs no INSERT/UPDATE here at all — only enough SELECT to render the
-- "connected as ..." line, and DELETE so a disconnect works even if the
-- service-role path is unavailable.
REVOKE ALL ON TABLE gmail_connections FROM authenticated;
GRANT SELECT (id, owner_id, email, token_expiry, last_synced_at, created_at,
              sync_error)
  ON TABLE gmail_connections TO authenticated;
GRANT DELETE ON TABLE gmail_connections TO authenticated;

-- The cron sweeps every connection due for a sync; without this it is a full
-- scan on a table that grows with every paying founder.
CREATE INDEX IF NOT EXISTS gmail_connections_sync_idx
  ON gmail_connections (last_synced_at NULLS FIRST);
