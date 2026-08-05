import { withCrmAuth, throwOnDbError, requireString, optionalString, badRequest } from '@/lib/crm/server';
import { assertCan } from '@/lib/crm/permissions';
import { MANUAL_EVENT_TYPES } from '@/lib/crm/events';
import type { CrmEventType } from '@/types/crm';

/**
 * POST /api/crm/events — log something that happened by hand
 *
 * Only the event types a founder can genuinely witness are accepted. A client
 * cannot post EMAIL_SENT or STAGE_CHANGED: those are written by triggers when
 * the underlying thing actually happens, and allowing them here would let the
 * timeline claim an email was sent that never left the building.
 */
export default withCrmAuth(['POST'], async ({ db, plan, req, userId }) => {
  assertCan(plan, 'investor_timeline');

  const relationshipId = requireString(req.body, 'relationship_id');
  const eventType = requireString(req.body, 'event_type') as CrmEventType;

  if (!MANUAL_EVENT_TYPES.includes(eventType)) {
    badRequest(
      `${eventType} is recorded automatically and cannot be logged by hand. ` +
        `Loggable types: ${MANUAL_EVENT_TYPES.join(', ')}`
    );
  }

  // occurred_at is separate from created_at on purpose: a call from Tuesday
  // logged on Friday belongs on Tuesday in the timeline.
  const occurredAt = optionalString(req.body, 'occurred_at');
  if (occurredAt && Number.isNaN(new Date(occurredAt).getTime())) {
    badRequest('occurred_at must be a valid date');
  }

  const { data, error } = await db
    .from('relationship_events')
    .insert({
      owner_id: userId,
      relationship_id: relationshipId,
      event_type: eventType,
      summary: optionalString(req.body, 'summary'),
      payload: typeof req.body?.payload === 'object' && req.body.payload ? req.body.payload : {},
      is_manual: true,
      occurred_at: occurredAt || new Date().toISOString(),
      created_by: userId,
    })
    .select()
    .single();
  throwOnDbError(error, 'log event');

  return { event: data };
});
