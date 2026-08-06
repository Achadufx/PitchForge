-- Add Gmail threading columns for Message-ID based reply detection
-- Migration 0009

-- Add columns to store Gmail Message-ID and threadId for accurate reply matching
ALTER TABLE sent_emails
  ADD COLUMN IF NOT EXISTS provider_thread_id text;

COMMENT ON COLUMN sent_emails.provider_message_id IS
  'RFC 2822 Message-ID for Gmail sends (e.g., <CAF...@mail.gmail.com>), Resend message ID for legacy sends. Used for In-Reply-To/References matching.';

COMMENT ON COLUMN sent_emails.provider_thread_id IS
  'Gmail threadId for thread-based reply matching. NULL for Resend sends.';

-- Index for thread-based reply lookup
CREATE INDEX IF NOT EXISTS idx_sent_emails_thread_id
  ON sent_emails(provider_thread_id)
  WHERE provider_thread_id IS NOT NULL;

-- Index for Message-ID based reply lookup
CREATE INDEX IF NOT EXISTS idx_sent_emails_message_id
  ON sent_emails(provider_message_id)
  WHERE provider_message_id IS NOT NULL;
