import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * Reserved for trusted backend jobs that have no user session to act on behalf
 * of: cron, Resend delivery webhooks, sequence execution, background AI
 * generation. Anything that runs in response to a user's request should use
 * `serverClientForToken` below instead, so the database — not the route handler
 * — remains the thing that enforces isolation.
 *
 * Importing this module from client-side code is a build error by construction:
 * `SUPABASE_SERVICE_ROLE_KEY` has no NEXT_PUBLIC_ prefix, so it is undefined in
 * the browser bundle and the guard below throws.
 */

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. This client is server-only and ' +
        'cannot fall back to the anon key — every write it makes assumes RLS is bypassed.'
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/**
 * A request-scoped client that carries the caller's access token, so every
 * query runs under their RLS policies.
 *
 * This is the default for API routes. It means a route that forgets to filter
 * by owner still cannot read another founder's data — the isolation lives in
 * the database, not in the handler's diligence.
 */
export function serverClientForToken(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase URL and anon key are required');
  }

  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Pulls a bearer token out of an incoming request's Authorization header. */
export function bearerToken(req: { headers: Record<string, unknown> }): string | null {
  const raw = req.headers?.authorization;
  if (typeof raw !== 'string') return null;
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
