import React, { useState, useEffect, useMemo, useCallback } from 'react';
import tokens from '@/lib/designTokens';
import { supabase } from '@/lib/supabase';
import { crmApi, ApiError } from '@/lib/crm/api';
import {
  followupBucket,
  FOLLOWUP_BUCKET_ORDER,
  FOLLOWUP_BUCKET_LABEL,
  relativeTime,
} from '@/lib/crm/stats';
import type {
  FollowupCandidate,
  FollowupsResponse,
  FollowupBucket,
  PipelineStage,
  Campaign,
} from '@/types/crm';
import {
  Spinner,
  ErrorNote,
  Button,
  Badge,
  Select,
  Field,
  TextInput,
  TextArea,
  Modal,
} from '@/components/crm/ui';

const c = tokens.colors;

/**
 * The follow-up queue.
 *
 * One question, answered top to bottom: who has gone quiet longest. The list is
 * ordered by silence rather than by name or stage because that is the only
 * order in which working down it is the right thing to do — and the founder is
 * meant to work down it, not browse it.
 *
 * Every row offers exactly two actions. Writing the follow-up is the one that
 * takes effort, so it is generated; marking someone as no longer worth chasing
 * is the one founders avoid, so it is a single click with no confirmation.
 */

interface StartupProfile {
  companyName?: string;
  company_name?: string;
  description?: string;
  oneLiner?: string;
  one_liner?: string;
  amountRaising?: string;
  amount_raising?: string;
  [key: string]: unknown;
}

/** The profile table has drifted between camelCase and snake_case; read both. */
function readProfile(profile: StartupProfile | null) {
  if (!profile) return null;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = profile[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };
  const name = pick('companyName', 'company_name');
  const description = pick('description', 'oneLiner', 'one_liner', 'businessModel', 'business_model');
  if (!name || !description) return null;
  return { name, description, ask: pick('amountRaising', 'amount_raising') };
}

export default function Followups({
  stages,
  campaigns,
  onOpen,
  onChanged,
}: {
  stages: PipelineStage[];
  campaigns: Campaign[];
  onOpen: (id: string) => void;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<FollowupsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StartupProfile | null>(null);
  const [composing, setComposing] = useState<FollowupCandidate | null>(null);

  const noResponseStage = useMemo(
    () => stages.find((stage) => stage.stage_key === 'no_response') || null,
    [stages]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const suffix = campaignId ? `?campaign_id=${encodeURIComponent(campaignId)}` : '';
      setData(await crmApi.get<FollowupsResponse>(`/api/crm/followups${suffix}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your follow-ups');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  // Loaded once and in the background. A missing profile only disables
  // generation, so it must never block the queue from rendering.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user?.id;
        if (!userId) return;
        const { data: row } = await supabase
          .from('startup_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (!cancelled) setProfile((row as StartupProfile) || null);
      } catch {
        // Non-fatal by design.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<FollowupBucket, FollowupCandidate[]>();
    for (const bucket of FOLLOWUP_BUCKET_ORDER) map.set(bucket, []);
    for (const candidate of data?.candidates || []) {
      map.get(followupBucket(candidate.daysSincePitch))!.push(candidate);
    }
    return map;
  }, [data]);

  async function markNoResponse(candidate: FollowupCandidate) {
    if (!noResponseStage) {
      setError(
        'Your pipeline has no "No Response" stage, so there is nowhere to move this investor. ' +
          'Add one in Campaigns, or run migration 0007.'
      );
      return;
    }
    if (candidate.relationship.stage_id === noResponseStage.id) return;

    setBusyId(candidate.relationship.id);
    // Optimistic removal: the row is gone from this queue's point of view the
    // moment the founder decides it is, and comes back if the write fails.
    const previous = data;
    setData((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((item) =>
              item.relationship.id === candidate.relationship.id
                ? {
                    ...item,
                    relationship: {
                      ...item.relationship,
                      stage_id: noResponseStage.id,
                      stage: noResponseStage,
                    },
                  }
                : item
            ),
          }
        : current
    );

    try {
      await crmApi.patch(`/api/crm/relationships/${candidate.relationship.id}`, {
        stage_id: noResponseStage.id,
      });
      onChanged?.();
    } catch (err) {
      setData(previous);
      setError(err instanceof ApiError ? err.message : 'Could not update that investor');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Spinner label="Loading your follow-ups" />;

  const counts = data?.counts;
  const total = data?.total ?? 0;
  const overdue = (counts?.seven_to_fourteen ?? 0) + (counts?.over_fourteen ?? 0);

  return (
    <div>
      {error && <ErrorNote onRetry={load}>{error}</ErrorNote>}

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 18,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ marginRight: 'auto' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.text.primary }}>
            {total === 0
              ? 'Nothing waiting on you'
              : `${total} investor${total === 1 ? '' : 's'} pitched, no reply`}
          </div>
          {overdue > 0 && (
            <div style={{ fontSize: 13, color: c.status.error, marginTop: 3, fontWeight: 600 }}>
              {overdue} {overdue === 1 ? 'has' : 'have'} been quiet a week or more
            </div>
          )}
        </div>

        <Select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          style={{ flex: '0 1 180px', width: 'auto' }}
          aria-label="Filter by campaign"
        >
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </Select>
      </div>

      {total === 0 ? (
        <div
          style={{
            background: c.status.successBg,
            border: `1px solid ${c.status.successBorder}`,
            borderRadius: tokens.radius.xl,
            padding: '40px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: c.status.success, marginBottom: 6 }}>
            All caught up
          </div>
          <p
            style={{
              fontSize: 13,
              color: c.text.secondary,
              margin: '0 auto',
              maxWidth: 400,
              lineHeight: 1.6,
            }}
          >
            Every investor you have pitched has either replied or is still inside the window worth
            waiting out. Send a new batch and they will appear here when it is time to chase.
          </p>
        </div>
      ) : (
        FOLLOWUP_BUCKET_ORDER.map((bucket) => {
          const rows = grouped.get(bucket) || [];
          if (!rows.length) return null;
          return (
            <section key={bucket} style={{ marginBottom: 26 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                  paddingBottom: 8,
                  borderBottom: `1px solid ${c.border.default}`,
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: c.text.primary,
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {FOLLOWUP_BUCKET_LABEL[bucket]}
                </h3>
                <Badge>{rows.length}</Badge>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map((candidate) => (
                  <FollowupRow
                    key={candidate.relationship.id}
                    candidate={candidate}
                    busy={busyId === candidate.relationship.id}
                    canMark={!!noResponseStage}
                    alreadyNoResponse={
                      !!noResponseStage && candidate.relationship.stage_id === noResponseStage.id
                    }
                    onOpen={() => onOpen(candidate.relationship.id)}
                    onCompose={() => setComposing(candidate)}
                    onMarkNoResponse={() => markNoResponse(candidate)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {composing && (
        <ComposeFollowup
          candidate={composing}
          profile={readProfile(profile)}
          onClose={() => setComposing(null)}
          onSent={() => {
            setComposing(null);
            load();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function FollowupRow({
  candidate,
  busy,
  canMark,
  alreadyNoResponse,
  onOpen,
  onCompose,
  onMarkNoResponse,
}: {
  candidate: FollowupCandidate;
  busy: boolean;
  canMark: boolean;
  alreadyNoResponse: boolean;
  onOpen: () => void;
  onCompose: () => void;
  onMarkNoResponse: () => void;
}) {
  const { relationship, daysSincePitch } = candidate;
  const contact = relationship.investor_contact;

  // Red once past the point where the nightly sweep would act. The colour is
  // the same signal the sweep uses, so the UI never disagrees with the job.
  const dayColor =
    daysSincePitch == null
      ? c.text.muted
      : daysSincePitch >= 14
        ? c.status.error
        : daysSincePitch >= 7
          ? c.status.warning
          : c.text.secondary;

  return (
    <div
      style={{
        background: c.bg.card,
        border: `1px solid ${c.border.default}`,
        borderRadius: tokens.radius.lg,
        padding: 14,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        opacity: busy ? 0.55 : 1,
        transition: `opacity ${tokens.transitions.fast}`,
      }}
    >
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <button
          onClick={onOpen}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            margin: 0,
            textAlign: 'left',
            cursor: 'pointer',
            font: 'inherit',
            color: c.text.primary,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {contact || relationship.investor_firm}
        </button>

        {contact && (
          <div style={{ fontSize: 12, color: c.text.secondary, marginTop: 2 }}>
            {relationship.investor_firm}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            marginTop: 8,
            fontSize: 11,
            color: c.text.muted,
          }}
        >
          <span style={{ color: dayColor, fontWeight: 600 }}>
            {daysSincePitch == null
              ? 'Never pitched'
              : daysSincePitch === 0
                ? 'Pitched today'
                : `${daysSincePitch} day${daysSincePitch === 1 ? '' : 's'} since pitch`}
          </span>
          {candidate.followupCount > 0 && (
            <span>
              {candidate.followupCount} follow-up{candidate.followupCount === 1 ? '' : 's'} sent
            </span>
          )}
          {candidate.opened && <span style={{ color: c.status.success }}>Opened</span>}
          {candidate.lastActivityAt && <span>Last activity {relativeTime(candidate.lastActivityAt)}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="sm" onClick={onCompose} disabled={busy || !relationship.investor_email}>
          Send follow-up
        </Button>
        {canMark && !alreadyNoResponse && (
          <Button size="sm" variant="ghost" onClick={onMarkNoResponse} disabled={busy}>
            Mark as no response
          </Button>
        )}
        {alreadyNoResponse && <Badge>No response</Badge>}
      </div>

      {!relationship.investor_email && (
        <div style={{ flexBasis: '100%', fontSize: 11, color: c.text.muted }}>
          No email address on file — open the investor to add one before following up.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

function ComposeFollowup({
  candidate,
  profile,
  onClose,
  onSent,
}: {
  candidate: FollowupCandidate;
  profile: { name: string; description: string; ask: string } | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { relationship } = candidate;
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [generating, setGenerating] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!profile) {
      setGenerating(false);
      setError(
        'Add your startup profile first — the follow-up needs your company name and what you do.'
      );
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followUp: true,
          investorName: relationship.investor_contact || relationship.investor_firm,
          firm: relationship.investor_firm,
          startupName: profile.name,
          description: profile.description,
          ask: profile.ask,
          previousSubject: candidate.lastEmailSubject,
          daysSince: candidate.daysSincePitch,
          followupCount: candidate.followupCount,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Generation failed (${res.status})`);
      setSubject(payload.subject || '');
      setBody(payload.body || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not write a follow-up');
    } finally {
      setGenerating(false);
    }
  }, [candidate, profile, relationship]);

  useEffect(() => {
    generate();
  }, [generate]);

  async function send() {
    if (!subject.trim() || body.trim().length < 20) {
      setError('A follow-up needs a subject and at least a couple of sentences.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      // The session token goes on deliberately: send-pitches records into the
      // CRM only when it can identify the caller, and relationshipId ties the
      // send to this exact thread rather than re-resolving it by firm.
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await fetch('/api/send-pitches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          campaignId: relationship.campaign_id,
          pitches: [
            {
              name: relationship.investor_contact || relationship.investor_firm,
              firm: relationship.investor_firm,
              email: relationship.investor_email,
              subject: subject.trim(),
              body: body.trim(),
              emailType: 'followup',
              relationshipId: relationship.id,
            },
          ],
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Send failed (${res.status})`);

      const first = (payload.results || [])[0];
      if (!first || !first.success) {
        throw new Error((first && first.error) || 'The email was not delivered');
      }

      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that follow-up');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title={`Follow up with ${relationship.investor_contact || relationship.investor_firm}`}
      onClose={onClose}
      width={560}
    >
      <p style={{ fontSize: 12, color: c.text.muted, marginTop: 0, marginBottom: 16 }}>
        To {relationship.investor_email}
        {candidate.daysSincePitch != null && ` · ${candidate.daysSincePitch} days since your pitch`}
      </p>

      {error && <ErrorNote>{error}</ErrorNote>}

      {generating ? (
        <Spinner label="Writing your follow-up" />
      ) : (
        <>
          <Field label="Subject">
            <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Message" hint="Edit anything before it goes out — this is your voice, not the model's.">
            <TextArea value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 220 }} />
          </Field>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <Button onClick={send} disabled={sending}>
              {sending ? 'Sending…' : 'Send follow-up'}
            </Button>
            <Button variant="secondary" onClick={generate} disabled={sending}>
              Rewrite
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
