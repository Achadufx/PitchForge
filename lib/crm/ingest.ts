import type { NextApiRequest } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serverClientForToken, bearerToken } from '@/lib/supabaseAdmin';
import { can } from '@/lib/crm/permissions';
import { resolvePlan } from '@/lib/crm/server';
import type { Plan, EmailType } from '@/types/crm';

/**
 * CRM ingest — the bridge between the pitch flow and the pipeline.
 *
 * The point of the CRM is that a founder never has to maintain it. Generating a
 * pitch and sending an email are the two things they already do, so those two
 * actions are what fill the timeline. Nothing here is a separate step they can
 * forget.
 *
 * Two rules govern every function in this file:
 *
 *  1. Recording is best-effort and never fails the caller. If the email left
 *     the building, the request succeeded — a CRM write that throws afterwards
 *     must not turn a delivered pitch into a 500 the founder reads as "it
 *     didn't send". Failures are logged and reported in the response, not
 *     raised.
 *
 *  2. Auth is optional. The pitch routes are used by callers that have no
 *     session, and adding a hard auth requirement would break them. When a
 *     valid token is present and the plan allows it, we record; otherwise the
 *     route behaves exactly as it did before.
 */

export interface IngestContext {
  userId: string;
  plan: Plan;
  db: SupabaseClient;
}

/**
 * Resolves a CRM context from an optional bearer token.
 *
 * Returns null — never throws — when there is no token, the token is invalid,
 * or the plan has no CRM. Callers treat null as "don't record".
 */
export async function optionalCrmContext(req: NextApiRequest): Promise<IngestContext | null> {
  try {
    const token = bearerToken(req as unknown as { headers: Record<string, unknown> });
    if (!token) return null;

    const db = serverClientForToken(token);
    const { data, error } = await db.auth.getUser();
    if (error || !data?.user) return null;

    const userId = data.user.id;
    const plan = await resolvePlan(userId);
    if (!can(plan, 'crm_pipeline')) return null;

    return { userId, plan, db };
  } catch (err) {
    console.error('[crm ingest] context resolution failed:', err);
    return null;
  }
}

/**
 * Finds the campaign to file this activity under.
 *
 * Falls back to the newest active campaign, and creates one if the founder has
 * none. Auto-creating is deliberate: a founder who sends their first batch of
 * pitches before ever opening the CRM tab should still find their pipeline
 * populated when they do, rather than an empty screen that makes the feature
 * look broken.
 */
export async function resolveCampaignId(
  ctx: IngestContext,
  preferred?: string | null
): Promise<string | null> {
  const { db, userId } = ctx;

  if (preferred) {
    const { data } = await db.from('campaigns').select('id').eq('id', preferred).maybeSingle();
    if (data) return data.id;
    // A campaign_id that does not resolve is more likely a stale client than an
    // attack — RLS already scoped the lookup — so fall through rather than fail.
  }

  const { data: existing } = await db
    .from('campaigns')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);
  if (existing && existing.length) return existing[0].id;

  const { data: created, error } = await db
    .from('campaigns')
    .insert({
      owner_id: userId,
      name: 'Outreach',
      goal: 'Created automatically from your first batch of pitches.',
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[crm ingest] could not create default campaign:', error.message);
    return null;
  }
  return created.id;
}

export interface InvestorRef {
  firm: string;
  contact?: string | null;
  email?: string | null;
  investorId?: string | number | null;
}

/**
 * Returns the relationship for this investor in this campaign, creating it if
 * it does not exist.
 *
 * Matching prefers email, then firm name. Email is the stronger key — two
 * partners at the same firm are two relationships, and the same firm reached at
 * two addresses is genuinely two threads — but a founder pitching a firm with
 * no named contact still gets one row rather than a duplicate per send.
 */
export async function findOrCreateRelationship(
  ctx: IngestContext,
  campaignId: string,
  investor: InvestorRef
): Promise<string | null> {
  const { db, userId } = ctx;
  const firm = investor.firm?.trim();
  if (!firm) return null;

  const email = investor.email?.trim().toLowerCase() || null;

  let lookup = db
    .from('investor_relationships')
    .select('id')
    .eq('campaign_id', campaignId)
    .is('archived_at', null)
    .limit(1);

  lookup = email ? lookup.ilike('investor_email', email) : lookup.ilike('investor_firm', firm);

  const { data: found, error: lookupError } = await lookup;
  if (lookupError) {
    console.error('[crm ingest] relationship lookup failed:', lookupError.message);
    return null;
  }
  if (found && found.length) return found[0].id;

  // Stage is left to the route's default (the first stage), so a newly pitched
  // investor lands at the top of the pipeline rather than in a stage this
  // function had to guess.
  const { data: stages } = await db
    .from('pipeline_stages')
    .select('id')
    .order('position', { ascending: true })
    .limit(1);
  const stageId = stages && stages.length ? stages[0].id : null;
  if (!stageId) {
    console.error('[crm ingest] no pipeline stages exist; cannot create relationship');
    return null;
  }

  const { data: created, error } = await db
    .from('investor_relationships')
    .insert({
      owner_id: userId,
      campaign_id: campaignId,
      stage_id: stageId,
      investor_id: investor.investorId ?? null,
      investor_firm: firm,
      investor_contact: investor.contact?.trim() || null,
      investor_email: email,
    })
    .select('id')
    .single();

  if (error) {
    // 23505 means a concurrent send in the same batch created it first. Read it
    // back instead of failing — a duplicate here is a race, not an error.
    if (error.code === '23505') {
      const { data: raced } = await lookup;
      if (raced && raced.length) return raced[0].id;
    }
    console.error('[crm ingest] could not create relationship:', error.message);
    return null;
  }

  return created.id;
}

/**
 * Records a generated pitch and its timeline event.
 *
 * `generated_pitches` has no trigger of its own — unlike a sent email, a
 * generated draft is not always worth a timeline entry, so the decision lives
 * here where the caller's intent is known.
 */
export async function recordPitchGenerated(
  ctx: IngestContext,
  args: {
    relationshipId: string | null;
    investorFirm: string | null;
    investorName: string | null;
    subject: string;
    body: string;
    researchNotes?: string | null;
    model?: string | null;
  }
): Promise<string | null> {
  const { db, userId } = ctx;

  // Revision is per relationship, so a regenerated pitch reads as a revision
  // rather than a second unrelated draft.
  let revision = 1;
  let isRegeneration = false;
  if (args.relationshipId) {
    const { count } = await db
      .from('generated_pitches')
      .select('id', { count: 'exact', head: true })
      .eq('relationship_id', args.relationshipId);
    if (count && count > 0) {
      revision = count + 1;
      isRegeneration = true;
    }
  }

  const { data, error } = await db
    .from('generated_pitches')
    .insert({
      owner_id: userId,
      relationship_id: args.relationshipId,
      investor_firm: args.investorFirm,
      investor_name: args.investorName,
      subject: args.subject,
      body: args.body,
      research_notes: args.researchNotes ?? null,
      model: args.model ?? null,
      revision,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[crm ingest] could not record pitch:', error.message);
    return null;
  }

  if (args.relationshipId) {
    const { error: eventError } = await db.from('relationship_events').insert({
      owner_id: userId,
      relationship_id: args.relationshipId,
      event_type: isRegeneration ? 'PITCH_REGENERATED' : 'PITCH_GENERATED',
      summary: args.subject,
      payload: { generated_pitch_id: data.id, revision },
      is_manual: false,
      occurred_at: new Date().toISOString(),
      created_by: userId,
    });
    if (eventError) {
      console.error('[crm ingest] could not log pitch event:', eventError.message);
    }
  }

  return data.id;
}

export interface SendRecord {
  firm: string;
  contact?: string | null;
  email: string;
  subject: string;
  body: string;
  providerMessageId?: string | null;
  emailType?: EmailType;
  investorId?: string | number | null;
  generatedPitchId?: string | null;
}

export interface IngestSummary {
  recorded: number;
  failed: number;
  campaignId: string | null;
}

/**
 * Records a batch of delivered emails against the pipeline.
 *
 * Only successful sends are passed in: a failed send is not a timeline event,
 * and recording one would tell the founder they contacted somebody they did
 * not. The EMAIL_SENT event and the relationship's last_interaction_at are both
 * written by triggers on `sent_emails`, so this function only inserts rows.
 */
export async function recordEmailsSent(
  ctx: IngestContext,
  sends: SendRecord[],
  campaignIdHint?: string | null
): Promise<IngestSummary> {
  const summary: IngestSummary = { recorded: 0, failed: 0, campaignId: null };
  if (!sends.length) return summary;

  const campaignId = await resolveCampaignId(ctx, campaignIdHint);
  summary.campaignId = campaignId;
  if (!campaignId) {
    summary.failed = sends.length;
    return summary;
  }

  for (const send of sends) {
    try {
      const relationshipId = await findOrCreateRelationship(ctx, campaignId, {
        firm: send.firm,
        contact: send.contact,
        email: send.email,
        investorId: send.investorId,
      });
      if (!relationshipId) {
        summary.failed += 1;
        continue;
      }

      const { error } = await ctx.db.from('sent_emails').insert({
        owner_id: ctx.userId,
        relationship_id: relationshipId,
        generated_pitch_id: send.generatedPitchId ?? null,
        email_type: send.emailType || 'initial_pitch',
        to_email: send.email,
        subject: send.subject,
        body: send.body,
        provider_message_id: send.providerMessageId ?? null,
        delivery_status: 'sent',
        sent_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[crm ingest] could not record send:', error.message);
        summary.failed += 1;
      } else {
        summary.recorded += 1;
      }
    } catch (err) {
      console.error('[crm ingest] unexpected failure recording send:', err);
      summary.failed += 1;
    }
  }

  return summary;
}
