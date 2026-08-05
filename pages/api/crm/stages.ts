import { withCrmAuth, throwOnDbError, requireString, badRequest, notFound } from '@/lib/crm/server';
import { assertCan } from '@/lib/crm/permissions';
import type { StageKind } from '@/types/crm';

const KINDS: StageKind[] = ['open', 'won', 'lost', 'dormant'];

/**
 * GET    /api/crm/stages           — the pipeline definition
 * POST   /api/crm/stages           — add a stage (Pro)
 * PATCH  /api/crm/stages?id=...    — rename or recolour (Pro)
 * PATCH  /api/crm/stages?reorder=1 — reorder, body: { order: [id, id, ...] } (Pro)
 * DELETE /api/crm/stages?id=...    — remove an empty stage (Pro)
 *
 * Reading the pipeline is available on every plan that has the CRM; changing it
 * is Pro. That split is why stages are rows: the gate moves without a migration.
 */
export default withCrmAuth(['GET', 'POST', 'PATCH', 'DELETE'], async ({ db, plan, req, userId }) => {
  assertCan(plan, 'crm_pipeline');

  if (req.method === 'GET') {
    const { data, error } = await db
      .from('pipeline_stages')
      .select('*')
      .order('position', { ascending: true });
    throwOnDbError(error, 'list stages');
    return { stages: data || [] };
  }

  assertCan(plan, 'custom_stages');

  if (req.method === 'POST') {
    const name = requireString(req.body, 'name');
    const kind = (req.body?.kind ?? 'open') as StageKind;
    if (!KINDS.includes(kind)) badRequest(`kind must be one of: ${KINDS.join(', ')}`);

    // Append to the end. The unique index on (owner_id, position) means a
    // colliding position is an error rather than a silently reordered board.
    const { data: last, error: lastError } = await db
      .from('pipeline_stages')
      .select('position')
      .order('position', { ascending: false })
      .limit(1);
    throwOnDbError(lastError, 'resolve next stage position');
    const nextPosition = ((last || [])[0]?.position ?? 0) + 1;

    const { data, error } = await db
      .from('pipeline_stages')
      .insert({
        owner_id: userId,
        name,
        position: nextPosition,
        color: (typeof req.body?.color === 'string' && req.body.color.trim()) || '#8B7355',
        kind,
        is_default: false,
      })
      .select()
      .single();
    throwOnDbError(error, 'create stage');
    return { stage: data };
  }

  if (req.method === 'PATCH' && req.query.reorder) {
    const order = req.body?.order;
    if (!Array.isArray(order) || !order.every((id) => typeof id === 'string')) {
      badRequest('order must be an array of stage ids');
    }

    // Two passes with a negative parking range in between. The unique index on
    // (owner_id, position) would reject a direct 1→2 swap mid-sequence, since
    // the intermediate state has two stages claiming the same slot.
    for (let i = 0; i < order.length; i += 1) {
      const { error } = await db
        .from('pipeline_stages')
        .update({ position: -(i + 1) })
        .eq('id', order[i]);
      throwOnDbError(error, 'park stage position');
    }
    for (let i = 0; i < order.length; i += 1) {
      const { error } = await db
        .from('pipeline_stages')
        .update({ position: i + 1 })
        .eq('id', order[i]);
      throwOnDbError(error, 'apply stage position');
    }

    const { data, error } = await db
      .from('pipeline_stages')
      .select('*')
      .order('position', { ascending: true });
    throwOnDbError(error, 'reload stages');
    return { stages: data || [] };
  }

  const id = req.query.id;
  if (typeof id !== 'string' || !id) badRequest('stage id is required');

  if (req.method === 'DELETE') {
    // The FK is ON DELETE RESTRICT, so Postgres would refuse anyway — but a
    // named count reads better than a foreign key violation.
    const { count, error: countError } = await db
      .from('investor_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('stage_id', id);
    throwOnDbError(countError, 'count stage relationships');
    if (count && count > 0) {
      badRequest(`That stage still holds ${count} investor${count === 1 ? '' : 's'}. Move them first.`);
    }

    const { error } = await db.from('pipeline_stages').delete().eq('id', id);
    throwOnDbError(error, 'delete stage');
    return { ok: true };
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (typeof body.name === 'string') {
    if (!body.name.trim()) badRequest('name cannot be empty');
    patch.name = body.name.trim();
  }
  if (typeof body.color === 'string' && body.color.trim()) patch.color = body.color.trim();
  if ('kind' in body) {
    const kind = body.kind as StageKind;
    if (!KINDS.includes(kind)) badRequest(`kind must be one of: ${KINDS.join(', ')}`);
    patch.kind = kind;
  }

  if (!Object.keys(patch).length) badRequest('Nothing to update');

  const { data, error } = await db
    .from('pipeline_stages')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();
  throwOnDbError(error, 'update stage');
  if (!data) notFound('Stage not found');

  return { stage: data };
});
