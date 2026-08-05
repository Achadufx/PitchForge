import type { NextApiRequest, NextApiResponse } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serverClientForToken, bearerToken, supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizePlan, PlanRequiredError } from '@/lib/crm/permissions';
import type { Plan } from '@/types/crm';

/**
 * Shared plumbing for CRM API routes.
 *
 * Every route needs the same four things: the right method, an authenticated
 * user, a Supabase client scoped to that user's RLS, and their plan. Doing it
 * per-route is how one handler ends up reading the plan from a request body a
 * client controls.
 */

export interface CrmContext {
  userId: string;
  plan: Plan;
  /** Scoped to the caller's token. Every query runs under their RLS policies. */
  db: SupabaseClient;
  req: NextApiRequest;
  res: NextApiResponse;
}

type Handler = (ctx: CrmContext) => Promise<unknown>;

/**
 * Reads the plan from the database rather than trusting the client.
 *
 * `pages/app.js` keeps a copy in localStorage for instant sidebar rendering,
 * which is fine for display and useless as a control — anyone can edit it. The
 * paywall has to resolve against `user_plans`, and it does so with the service
 * role because a founder's own RLS policies on that table would not necessarily
 * let them read it.
 *
 * Defaults to 'free' on any failure. A plan lookup that errors should lock
 * features, never unlock them.
 */
export async function resolvePlan(userId: string): Promise<Plan> {
  try {
    const { data, error } = await supabaseAdmin()
      .from('user_plans')
      .select('plan')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return 'free';
    return normalizePlan(data.plan);
  } catch {
    return 'free';
  }
}

export function withCrmAuth(methods: string[], handler: Handler) {
  return async function route(req: NextApiRequest, res: NextApiResponse) {
    if (!methods.includes(req.method || '')) {
      res.setHeader('Allow', methods.join(', '));
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const token = bearerToken(req as unknown as { headers: Record<string, unknown> });
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    let db: SupabaseClient;
    try {
      db = serverClientForToken(token);
    } catch (err) {
      console.error('[crm] supabase client construction failed:', err);
      return res.status(500).json({ error: 'Server is not configured' });
    }

    // getUser() validates the token against Supabase rather than decoding it
    // locally, so an expired or forged JWT is rejected here and not three
    // queries later.
    const { data: userData, error: userError } = await db.auth.getUser();
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const userId = userData.user.id;
    const plan = await resolvePlan(userId);

    try {
      const payload = await handler({ userId, plan, db, req, res });
      if (res.writableEnded) return undefined;
      return res.status(200).json(payload ?? { ok: true });
    } catch (err) {
      if (err instanceof PlanRequiredError) {
        return res.status(402).json({
          error: err.message,
          feature: err.feature,
          requiredPlan: err.requiredPlan,
        });
      }
      if (err instanceof CrmError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[crm] unhandled route error:', err);
      return res.status(500).json({ error: 'Something went wrong' });
    }
  };
}

/** A route-level error with an intended status code. */
export class CrmError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'CrmError';
    this.status = status;
  }
}

export function badRequest(message: string): never {
  throw new CrmError(400, message);
}

export function notFound(message = 'Not found'): never {
  throw new CrmError(404, message);
}

/**
 * Turns a PostgREST error into a route error. Foreign key and unique violations
 * are the caller's fault and deserve a 409, not a 500 that reads as an outage.
 */
export function throwOnDbError(
  error: { message: string; code?: string } | null,
  context: string
): void {
  if (!error) return;
  console.error(`[crm] ${context}: ${error.message}`);
  if (error.code === '23505') throw new CrmError(409, 'That already exists');
  if (error.code === '23503') throw new CrmError(409, 'Referenced record does not exist');
  if (error.code === '23514') throw new CrmError(400, 'That value is not allowed');
  throw new CrmError(500, 'Database error');
}

/** Reads a required string field from a JSON body. */
export function requireString(body: unknown, field: string): string {
  const value = (body as Record<string, unknown> | null)?.[field];
  if (typeof value !== 'string' || !value.trim()) {
    badRequest(`${field} is required`);
  }
  return (value as string).trim();
}

export function optionalString(body: unknown, field: string): string | null {
  const value = (body as Record<string, unknown> | null)?.[field];
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim();
}
