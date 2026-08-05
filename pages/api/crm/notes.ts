import { withCrmAuth, throwOnDbError, requireString, badRequest, notFound } from '@/lib/crm/server';
import { assertCan } from '@/lib/crm/permissions';

/**
 * POST   /api/crm/notes        — write a note
 * PATCH  /api/crm/notes?id=... — edit one
 * DELETE /api/crm/notes?id=... — remove one
 *
 * Notes are editable and deletable, which is why they are their own table
 * rather than NOTE_ADDED events. The trigger in 0005 mirrors each new note into
 * the timeline as an immutable marker, so editing a note later does not rewrite
 * history — the intended behaviour for an audit trail.
 */
export default withCrmAuth(['POST', 'PATCH', 'DELETE'], async ({ db, plan, req, userId }) => {
  assertCan(plan, 'notes');

  if (req.method === 'POST') {
    const relationshipId = requireString(req.body, 'relationship_id');
    const body = requireString(req.body, 'body');

    const { data, error } = await db
      .from('relationship_notes')
      .insert({
        owner_id: userId,
        relationship_id: relationshipId,
        body,
        created_by: userId,
      })
      .select()
      .single();
    throwOnDbError(error, 'create note');
    return { note: data };
  }

  const id = req.query.id;
  if (typeof id !== 'string' || !id) badRequest('note id is required');

  if (req.method === 'DELETE') {
    const { error } = await db.from('relationship_notes').delete().eq('id', id);
    throwOnDbError(error, 'delete note');
    return { ok: true };
  }

  const body = requireString(req.body, 'body');
  const { data, error } = await db
    .from('relationship_notes')
    .update({ body })
    .eq('id', id)
    .select()
    .maybeSingle();
  throwOnDbError(error, 'update note');
  if (!data) notFound('Note not found');

  return { note: data };
});
