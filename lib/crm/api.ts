import { supabase } from '@/lib/supabase';

/**
 * Browser-side fetch wrapper for the CRM routes.
 *
 * Its whole job is to attach the current Supabase access token to every
 * request. Components never touch the session directly, so there is no path
 * where one of them forgets and the route 401s in a way that looks like a bug.
 *
 * The token is read per call rather than cached: Supabase refreshes it in the
 * background, and a cached copy would start failing after an hour of an open
 * tab — the exact session length a founder working a pipeline actually has.
 */

export class ApiError extends Error {
  readonly status: number;
  /** Present on 402s, so the caller can render the right upgrade prompt. */
  readonly requiredPlan?: string;
  readonly feature?: string;

  constructor(status: number, message: string, extra?: { requiredPlan?: string; feature?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requiredPlan = extra?.requiredPlan;
    this.feature = extra?.feature;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, 'You are signed out. Refresh and sign in again.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(path, { ...init, headers: { ...headers, ...(init?.headers || {}) } });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // A non-JSON body means something upstream failed before the handler ran.
    // Fall through to the status-based message rather than masking it.
  }

  if (!res.ok) {
    const body = (payload || {}) as { error?: string; requiredPlan?: string; feature?: string };
    throw new ApiError(res.status, body.error || `Request failed (${res.status})`, {
      requiredPlan: body.requiredPlan,
      feature: body.feature,
    });
  }

  return payload as T;
}

export const crmApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
