import { withCrmAuth, throwOnDbError, notFound, badRequest } from '@/lib/crm/server';
import { assertCan, HISTORY_WINDOW_DAYS } from '@/lib/crm/permissions';
import type { RelationshipStatus } from '@/types/crm';

const STATUSES: RelationshipStatus[] = ['active', 'snoozed', 'archived'];

/**
 * GET    /api/crm/relationships/:id — the whole relationship page in one call
 * PATCH  /api/crm/relationships/:id — stage moves, contact edits, archiving
 * DELETE /api/crm/relationships/:id — hard delete, cascading to all children
 *
 * The GET is deliberately fat. The relationship page shows timeline, notes,
 * tasks, meetings, emails and pitches together; fetching them separately would
 * mean six spinners resolving at six different moments on the one screen that
 * is supposed to feel instant.
 */
export default withCrmAuth(['GET', 'PATCH', 'DELETE'], async ({ db, plan, req }) => {
  assertCan(plan, 'crm_pipeline');

  const id = req.query.id;
  if (typeof id !== 'string') badRequest('relationship id is required');

  if (req.method === 'GET') {
    assertCan(plan, 'investor_timeline');

    const { data: relationship, error } = await db
      .from('investor_relationships')
      .select('*, stage:pipeline_stages(*), campaign:campaigns(id,name,status)')
      .eq('id', id)
      .maybeSingle();
    throwOnDbError(error, 'load relationship');
    if (!relationship) notFound('Relationship not found');

    // History is capped by plan on read, not on write. Nothing is deleted, so
    // upgrading restores the full timeline immediately.
    const windowDays = HISTORY_WINDOW_DAYS[plan];
    const since =
      windowDays == null
        ? null
        : new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    let eventsQuery = db
      .from('relationship_events')
      .select('*')
      .eq('relationship_id', id)
      .order('occurred_at', { ascending: false })
      .limit(300);
    if (since) eventsQuery = eventsQuery.gte('occurred_at', since);

    const [events, notes, tasks, meetings, emails, pitches, stageHistory] = await Promise.all([
      eventsQuery,
      db.from('relationship_notes').select('*').eq('relationship_id', id).order('created_at', { ascending: false }),
      db.from('tasks').select('*').eq('relationship_id', id).order('due_at', { ascending: true, nullsFirst: false }),
      db.from('relationship_meetings').select('*').eq('relationship_id', id).order('scheduled_at', { ascending: false }),
      db.from('sent_emails').select('*').eq('relationship_id', id).order('sent_at', { ascending: false }),
      db.from('generated_pitches').select('*').eq('relationship_id', id).order('created_at', { ascending: false }),
      db.from('relationship_stage_history').select('*').eq('relationship_id', id).order('changed_at', { ascending: false }),
    ]);

    throwOnDbError(events.error, 'load timeline');
    throwOnDbError(notes.error, 'load notes');
    throwOnDbError(tasks.error, 'load tasks');
    throwOnDbError(meetings.error, 'load meetings');
    throwOnDbError(emails.error, 'load emails');
    throwOnDbError(pitches.error, 'load pitches');
    throwOnDbError(stageHistory.error, 'load stage history');

    return {
      relationship,
      events: events.data || [],
      notes: notes.data || [],
      tasks: tasks.data || [],
      meetings: meetings.data || [],
      emails: emails.data || [],
      pitches: pitches.data || [],
      stageHistory: stageHistory.data || [],
      historyWindowDays: windowDays,
    };
  }

  if (req.method === 'DELETE') {
    const { error } = await db.from('investor_relationships').delete().eq('id', id);
    throwOnDbError(error, 'delete relationship');
    return { ok: true };
  }

  // PATCH
  const body = (req.body || {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  // stage_changed_at is not settable here — the BEFORE trigger owns it, so
  // time-in-stage cannot be falsified by a client.
  if (typeof body.stage_id === 'string' && body.stage_id) patch.stage_id = body.stage_id;
  if (typeof body.campaign_id === 'string' && body.campaign_id) patch.campaign_id = body.campaign_id;

  if ('status' in body) {
    const status = body.status as RelationshipStatus;
    if (!STATUSES.includes(status)) badRequest('status must be active, snoozed or archived');
    patch.status = status;
  }

  if (typeof body.investor_firm === 'string') {
    if (!body.investor_firm.trim()) badRequest('investor_firm cannot be empty');
    patch.investor_firm = body.investor_firm.trim();
  }
  for (const field of ['investor_contact', 'investor_email'] as const) {
    if (field in body) {
      patch[field] = typeof body[field] === 'string' ? (body[field] as string).trim() || null : null;
    }
  }

  if ('tags' in body) {
    patch.tags = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === 'string') : [];
  }

  if ('next_followup_at' in body) {
    assertCan(plan, 'manual_reminders');
    patch.next_followup_at = body.next_followup_at || null;
  }

  if ('relationship_score' in body) {
    const raw = body.relationship_score;
    if (raw === null || raw === '') {
      patch.relationship_score = null;
    } else {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        badRequest('relationship_score must be a whole number between 0 and 100');
      }
      patch.relationship_score = parsed;
    }
  }

  // Archiving is a timestamp, not a delete: the history stays, and the partial
  // unique index frees the investor to be re-added to the same campaign.
  if ('archived' in body) {
    patch.archived_at = body.archived ? new Date().toISOString() : null;
    patch.status = body.archived ? 'archived' : 'active';
  }

  if (!Object.keys(patch).length) badRequest('Nothing to update');

  const { data, error } = await db
    .from('investor_relationships')
    .update(patch)
    .eq('id', id)
    .select('*, stage:pipeline_stages(*), campaign:campaigns(id,name,status)')
    .maybeSingle();
  throwOnDbError(error, 'update relationship');
  if (!data) notFound('Relationship not found');

  return { relationship: data };
});
