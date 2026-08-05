import { withCrmAuth, throwOnDbError, requireString, optionalString, badRequest, notFound } from '@/lib/crm/server';
import { assertCan } from '@/lib/crm/permissions';

/**
 * GET    /api/crm/meetings?scope=upcoming — the founder's calendar strip
 * POST   /api/crm/meetings               — schedule
 * PATCH  /api/crm/meetings?id=...        — reschedule, or mark held with outcome
 * DELETE /api/crm/meetings?id=...
 *
 * MEETING_SCHEDULED and MEETING_COMPLETED events are written by the trigger in
 * 0005, so scheduling here and a meeting logged from anywhere else produce the
 * same timeline.
 */
export default withCrmAuth(['GET', 'POST', 'PATCH', 'DELETE'], async ({ db, plan, req, userId }) => {
  assertCan(plan, 'meetings');

  if (req.method === 'GET') {
    let query = db
      .from('relationship_meetings')
      .select('*, relationship:investor_relationships(id,investor_firm)');

    const { scope, relationship_id } = req.query;
    if (typeof relationship_id === 'string' && relationship_id) {
      query = query.eq('relationship_id', relationship_id);
    }

    if (scope === 'upcoming') {
      query = query
        .is('completed_at', null)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });
    } else {
      query = query.order('scheduled_at', { ascending: false });
    }

    const { data, error } = await query.limit(200);
    throwOnDbError(error, 'list meetings');
    return { meetings: data || [] };
  }

  if (req.method === 'POST') {
    const relationshipId = requireString(req.body, 'relationship_id');
    const scheduledAt = requireString(req.body, 'scheduled_at');
    if (Number.isNaN(new Date(scheduledAt).getTime())) badRequest('scheduled_at must be a valid date');

    const duration = req.body?.duration_minutes;
    let durationMinutes: number | null = null;
    if (duration !== undefined && duration !== null && duration !== '') {
      const parsed = Number(duration);
      if (!Number.isInteger(parsed) || parsed <= 0) badRequest('duration_minutes must be a positive whole number');
      durationMinutes = parsed;
    }

    const { data, error } = await db
      .from('relationship_meetings')
      .insert({
        owner_id: userId,
        relationship_id: relationshipId,
        title: optionalString(req.body, 'title'),
        meeting_type: optionalString(req.body, 'meeting_type') || 'video',
        scheduled_at: scheduledAt,
        duration_minutes: durationMinutes,
        location: optionalString(req.body, 'location'),
        notes: optionalString(req.body, 'notes'),
      })
      .select()
      .single();
    throwOnDbError(error, 'create meeting');
    return { meeting: data };
  }

  const id = req.query.id;
  if (typeof id !== 'string' || !id) badRequest('meeting id is required');

  if (req.method === 'DELETE') {
    const { error } = await db.from('relationship_meetings').delete().eq('id', id);
    throwOnDbError(error, 'delete meeting');
    return { ok: true };
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (typeof body.scheduled_at === 'string') {
    if (Number.isNaN(new Date(body.scheduled_at).getTime())) badRequest('scheduled_at must be a valid date');
    patch.scheduled_at = body.scheduled_at;
  }
  for (const field of ['title', 'location', 'notes', 'outcome'] as const) {
    if (field in body) patch[field] = typeof body[field] === 'string' ? (body[field] as string).trim() || null : null;
  }
  if (typeof body.meeting_type === 'string' && body.meeting_type.trim()) {
    patch.meeting_type = body.meeting_type.trim();
  }

  // `completed: true` stamps now unless the caller gives a time, so a founder
  // can log a meeting they held yesterday and have it land on yesterday.
  if ('completed' in body) {
    if (body.completed) {
      const at = typeof body.completed_at === 'string' ? body.completed_at : new Date().toISOString();
      if (Number.isNaN(new Date(at).getTime())) badRequest('completed_at must be a valid date');
      patch.completed_at = at;
    } else {
      patch.completed_at = null;
    }
  }

  if (!Object.keys(patch).length) badRequest('Nothing to update');

  const { data, error } = await db
    .from('relationship_meetings')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();
  throwOnDbError(error, 'update meeting');
  if (!data) notFound('Meeting not found');

  return { meeting: data };
});
