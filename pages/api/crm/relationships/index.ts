import {
  withCrmAuth,
  throwOnDbError,
  requireString,
  optionalString,
  badRequest,
} from '@/lib/crm/server';
import { assertCan } from '@/lib/crm/permissions';
import type { PipelineStage } from '@/types/crm';

/**
 * GET  /api/crm/relationships — the pipeline board, optionally filtered
 * POST /api/crm/relationships — add an investor to a campaign
 *
 * Query params on GET: campaign_id, stage_id, status, q (firm/contact search),
 * include_archived.
 */
export default withCrmAuth(['GET', 'POST'], async ({ db, plan, req, userId }) => {
  assertCan(plan, 'crm_pipeline');

  if (req.method === 'GET') {
    let query = db
      .from('investor_relationships')
      .select('*, stage:pipeline_stages(*), campaign:campaigns(id,name,status)');

    const { campaign_id, stage_id, status, q, include_archived } = req.query;

    if (typeof campaign_id === 'string' && campaign_id) query = query.eq('campaign_id', campaign_id);
    if (typeof stage_id === 'string' && stage_id) query = query.eq('stage_id', stage_id);
    if (typeof status === 'string' && status) query = query.eq('status', status);
    if (include_archived !== 'true') query = query.is('archived_at', null);

    if (typeof q === 'string' && q.trim()) {
      // Escape the PostgREST or() separators so a comma or paren in the search
      // term cannot restructure the filter.
      const term = q.trim().replace(/[,()]/g, ' ');
      query = query.or(
        `investor_firm.ilike.%${term}%,investor_contact.ilike.%${term}%,investor_email.ilike.%${term}%`
      );
    }

    const { data, error } = await query.order('updated_at', { ascending: false }).limit(500);
    throwOnDbError(error, 'list relationships');
    return { relationships: data || [] };
  }

  // POST
  const campaignId = requireString(req.body, 'campaign_id');
  const investorFirm = requireString(req.body, 'investor_firm');

  // Stage is optional on create: defaulting to the founder's first stage means
  // "add investor" is one click from the board, and an explicit stage_id still
  // wins when the caller has one.
  let stageId = optionalString(req.body, 'stage_id');
  if (!stageId) {
    const { data: stages, error: stageError } = await db
      .from('pipeline_stages')
      .select('*')
      .order('position', { ascending: true })
      .limit(1);
    throwOnDbError(stageError, 'resolve default stage');
    const first = (stages || [])[0] as PipelineStage | undefined;
    if (!first) badRequest('No pipeline stages exist yet. Open the CRM tab to set them up.');
    stageId = first!.id;
  }

  const investorId = req.body?.investor_id ?? null;

  const { data, error } = await db
    .from('investor_relationships')
    .insert({
      owner_id: userId,
      campaign_id: campaignId,
      stage_id: stageId,
      investor_id: investorId === '' ? null : investorId,
      investor_firm: investorFirm,
      investor_contact: optionalString(req.body, 'investor_contact'),
      investor_email: optionalString(req.body, 'investor_email'),
      tags: Array.isArray(req.body?.tags) ? req.body.tags.filter((t: unknown) => typeof t === 'string') : [],
    })
    .select('*, stage:pipeline_stages(*)')
    .single();

  // 23505 here means the partial unique index caught a second live relationship
  // for the same investor in the same campaign — worth saying plainly rather
  // than letting it read as a generic conflict.
  if (error?.code === '23505') {
    badRequest(`${investorFirm} is already in this campaign.`);
  }
  throwOnDbError(error, 'create relationship');

  // The INVESTOR_ADDED event and the opening stage-history row are written by
  // the trigger in 0005, so there is nothing to log here.
  return { relationship: data };
});
