import { withCrmAuth, throwOnDbError, requireString, optionalString, badRequest, notFound } from '@/lib/crm/server';
import { assertCan } from '@/lib/crm/permissions';
import type { Priority, TaskStatus, TaskType } from '@/types/crm';

const TYPES: TaskType[] = [
  'followup', 'review_pitch', 'send_followup', 'prepare_meeting',
  'call_investor', 'send_deck', 'upload_document', 'custom',
];
const STATUSES: TaskStatus[] = ['pending', 'completed', 'snoozed', 'cancelled'];
const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent'];

/**
 * GET    /api/crm/tasks              — the founder's queue
 * POST   /api/crm/tasks              — create (a reminder is type='followup')
 * PATCH  /api/crm/tasks?id=...       — complete, snooze, reschedule
 * DELETE /api/crm/tasks?id=...
 *
 * Query params on GET: scope=overdue|today|upcoming|all, relationship_id,
 * campaign_id, status.
 *
 * completed_at is stamped by the trigger in 0005, so the client only ever sets
 * status and the two can never disagree.
 */
export default withCrmAuth(['GET', 'POST', 'PATCH', 'DELETE'], async ({ db, plan, req, userId }) => {
  assertCan(plan, 'manual_reminders');

  if (req.method === 'GET') {
    let query = db.from('tasks').select('*, relationship:investor_relationships(id,investor_firm)');

    const { scope, relationship_id, campaign_id, status } = req.query;
    const now = new Date();

    if (typeof relationship_id === 'string' && relationship_id) query = query.eq('relationship_id', relationship_id);
    if (typeof campaign_id === 'string' && campaign_id) query = query.eq('campaign_id', campaign_id);
    if (typeof status === 'string' && status) query = query.eq('status', status);
    else if (scope !== 'all') query = query.eq('status', 'pending');

    if (scope === 'overdue') {
      query = query.lt('due_at', now.toISOString());
    } else if (scope === 'today') {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('due_at', endOfDay.toISOString());
    } else if (scope === 'upcoming') {
      query = query.gte('due_at', now.toISOString());
    }

    // nullsFirst: false keeps undated tasks at the bottom of the queue rather
    // than at the top, where they would outrank things that are actually due.
    const { data, error } = await query
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(300);
    throwOnDbError(error, 'list tasks');
    return { tasks: data || [] };
  }

  if (req.method === 'POST') {
    const title = requireString(req.body, 'title');
    const type = (req.body?.type ?? 'followup') as TaskType;
    if (!TYPES.includes(type)) badRequest(`type must be one of: ${TYPES.join(', ')}`);

    const priority = (req.body?.priority ?? 'normal') as Priority;
    if (!PRIORITIES.includes(priority)) badRequest(`priority must be one of: ${PRIORITIES.join(', ')}`);

    const dueAt = optionalString(req.body, 'due_at');
    if (dueAt && Number.isNaN(new Date(dueAt).getTime())) badRequest('due_at must be a valid date');

    const { data, error } = await db
      .from('tasks')
      .insert({
        owner_id: userId,
        relationship_id: optionalString(req.body, 'relationship_id'),
        campaign_id: optionalString(req.body, 'campaign_id'),
        type,
        title,
        notes: optionalString(req.body, 'notes'),
        priority,
        due_at: dueAt,
        assigned_to: userId,
      })
      .select()
      .single();
    throwOnDbError(error, 'create task');
    return { task: data };
  }

  const id = req.query.id;
  if (typeof id !== 'string' || !id) badRequest('task id is required');

  if (req.method === 'DELETE') {
    const { error } = await db.from('tasks').delete().eq('id', id);
    throwOnDbError(error, 'delete task');
    return { ok: true };
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if ('status' in body) {
    const status = body.status as TaskStatus;
    if (!STATUSES.includes(status)) badRequest(`status must be one of: ${STATUSES.join(', ')}`);
    patch.status = status;
  }
  if (typeof body.title === 'string') {
    if (!body.title.trim()) badRequest('title cannot be empty');
    patch.title = body.title.trim();
  }
  if ('notes' in body) patch.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
  if ('due_at' in body) {
    if (body.due_at && Number.isNaN(new Date(body.due_at as string).getTime())) {
      badRequest('due_at must be a valid date');
    }
    patch.due_at = body.due_at || null;
  }
  if ('priority' in body) {
    const priority = body.priority as Priority;
    if (!PRIORITIES.includes(priority)) badRequest(`priority must be one of: ${PRIORITIES.join(', ')}`);
    patch.priority = priority;
  }

  if (!Object.keys(patch).length) badRequest('Nothing to update');

  const { data, error } = await db.from('tasks').update(patch).eq('id', id).select().maybeSingle();
  throwOnDbError(error, 'update task');
  if (!data) notFound('Task not found');

  return { task: data };
});
