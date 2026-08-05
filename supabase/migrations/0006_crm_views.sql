-- ============================================================================
-- PitchWire CRM — analytics views
-- Depends on 0001–0005.
-- ============================================================================
-- Campaign stats are a view rather than a handful of client-side counts because
-- the dashboard, the campaign page, and any future export all need the same
-- numbers, and three implementations of "reply rate" will eventually disagree.
--
-- security_invoker = true makes the view run with the caller's permissions, so
-- the underlying RLS policies still apply and a founder can only ever see their
-- own aggregates. Without it a view would silently run as its owner and leak
-- every campaign in the table.
-- ============================================================================

CREATE OR REPLACE VIEW campaign_stats
WITH (security_invoker = true) AS
SELECT
  c.id                       AS campaign_id,
  c.owner_id,
  c.name,
  c.status,
  c.target_amount,
  c.currency,

  -- Archived relationships stay out of the live totals but remain in the table,
  -- so every count here filters them the same way the pipeline board does.
  count(r.id) FILTER (WHERE r.archived_at IS NULL)                  AS total_investors,
  count(r.id) FILTER (WHERE r.archived_at IS NULL AND s.kind = 'won')  AS investments,
  count(r.id) FILTER (WHERE r.archived_at IS NULL AND s.kind = 'lost') AS passes,

  -- Distinct relationship counts, not event counts: three follow-ups to one
  -- investor is still one investor contacted, and rates built on event totals
  -- would climb past 100%.
  count(DISTINCT e.relationship_id)
    FILTER (WHERE e.event_type IN ('EMAIL_SENT', 'FOLLOWUP_SENT'))  AS investors_emailed,
  count(DISTINCT e.relationship_id)
    FILTER (WHERE e.event_type = 'REPLIED')                         AS investors_replied,
  count(DISTINCT e.relationship_id)
    FILTER (WHERE e.event_type IN ('MEETING_SCHEDULED', 'MEETING_COMPLETED'))
                                                                    AS investors_met,

  -- Raw volume, which is a different question from reach and worth both.
  count(e.id) FILTER (WHERE e.event_type IN ('EMAIL_SENT', 'FOLLOWUP_SENT')) AS emails_sent,
  count(e.id) FILTER (WHERE e.event_type IN ('PITCH_GENERATED', 'PITCH_REGENERATED'))
                                                                    AS pitches_generated,

  max(e.occurred_at)                                                AS last_activity_at
FROM campaigns c
LEFT JOIN investor_relationships r ON r.campaign_id = c.id
LEFT JOIN pipeline_stages       s ON s.id = r.stage_id
LEFT JOIN relationship_events   e ON e.relationship_id = r.id
GROUP BY c.id, c.owner_id, c.name, c.status, c.target_amount, c.currency;

-- Rates are deliberately left to the application. Postgres would have to guard
-- every one against a zero denominator, and the client already needs the raw
-- counts to render "12 of 40" alongside the percentage.

COMMENT ON VIEW campaign_stats IS
  'Per-campaign funnel aggregates. Rates (reply/meeting/investment) are derived '
  'in the application from investors_emailed as the denominator.';
