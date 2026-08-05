import type { Plan } from '@/types/crm';

/**
 * Subscription gates for the CRM.
 *
 * Declared as one table rather than scattered `plan === 'pro'` checks, because
 * the same question gets asked in the sidebar, on the feature surface, and in
 * the API route that must not be bypassed by a crafted request. Three copies of
 * that condition is how a paywall ends up leaking.
 *
 * The API routes are the enforcement point. The UI reads the same table so the
 * two never disagree about what is locked, but a client-side check is a
 * courtesy, not a control.
 */

export type CrmFeature =
  // Free
  | 'investor_database'
  | 'pitch_generation'
  | 'email_sending'
  | 'sent_history'
  | 'basic_campaign_stats'
  // Starter
  | 'crm_pipeline'
  | 'investor_timeline'
  | 'manual_reminders'
  | 'campaign_management'
  | 'notes'
  | 'meetings'
  // Pro
  | 'automated_sequences'
  | 'unlimited_history'
  | 'ai_recommendations'
  | 'advanced_analytics'
  | 'custom_stages';

const PLAN_RANK: Record<Plan, number> = { free: 0, starter: 1, pro: 2 };

/** The lowest plan that unlocks each feature. */
const FEATURE_MINIMUM: Record<CrmFeature, Plan> = {
  investor_database: 'free',
  pitch_generation: 'free',
  email_sending: 'free',
  sent_history: 'free',
  basic_campaign_stats: 'free',

  crm_pipeline: 'starter',
  investor_timeline: 'starter',
  manual_reminders: 'starter',
  campaign_management: 'starter',
  notes: 'starter',
  meetings: 'starter',

  automated_sequences: 'pro',
  unlimited_history: 'pro',
  ai_recommendations: 'pro',
  advanced_analytics: 'pro',
  custom_stages: 'pro',
};

/** Monthly pitch generation ceilings, mirroring PLAN_LIMITS in pages/app.js. */
export const PITCH_LIMITS: Record<Plan, number> = { free: 10, starter: 100, pro: 500 };

/**
 * How far back the timeline reads on each plan, in days.
 *
 * Nothing is ever deleted — the cap is a read filter, so upgrading restores the
 * full history instantly rather than recovering nothing.
 */
export const HISTORY_WINDOW_DAYS: Record<Plan, number | null> = {
  free: 30,
  starter: 365,
  pro: null,
};

export function normalizePlan(value: unknown): Plan {
  return value === 'starter' || value === 'pro' ? value : 'free';
}

export function can(plan: Plan, feature: CrmFeature): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_MINIMUM[feature]];
}

export function requiredPlan(feature: CrmFeature): Plan {
  return FEATURE_MINIMUM[feature];
}

/** Copy for the upgrade prompt shown where a feature is locked. */
export function upgradeMessage(feature: CrmFeature): string {
  const needed = FEATURE_MINIMUM[feature];
  const label = needed === 'pro' ? 'Pro' : 'Starter';
  return `${FEATURE_LABEL[feature]} is part of ${label}.`;
}

const FEATURE_LABEL: Record<CrmFeature, string> = {
  investor_database: 'The investor database',
  pitch_generation: 'Pitch generation',
  email_sending: 'Email sending',
  sent_history: 'Sent history',
  basic_campaign_stats: 'Campaign stats',
  crm_pipeline: 'The CRM pipeline',
  investor_timeline: 'The investor timeline',
  manual_reminders: 'Reminders',
  campaign_management: 'Campaign management',
  notes: 'Notes',
  meetings: 'Meeting tracking',
  automated_sequences: 'Automated follow-up sequences',
  unlimited_history: 'Unlimited history',
  ai_recommendations: 'AI recommendations',
  advanced_analytics: 'Advanced analytics',
  custom_stages: 'Custom pipeline stages',
};

/**
 * Throws a shaped error an API route can turn into a 402. Kept here so the
 * status code and the payload are decided in one place; a route that forgets
 * would otherwise return a 500 and the client would show "something went
 * wrong" instead of an upgrade prompt.
 */
export class PlanRequiredError extends Error {
  readonly status = 402;
  readonly feature: CrmFeature;
  readonly requiredPlan: Plan;

  constructor(feature: CrmFeature) {
    super(upgradeMessage(feature));
    this.name = 'PlanRequiredError';
    this.feature = feature;
    this.requiredPlan = FEATURE_MINIMUM[feature];
  }
}

export function assertCan(plan: Plan, feature: CrmFeature): void {
  if (!can(plan, feature)) throw new PlanRequiredError(feature);
}
