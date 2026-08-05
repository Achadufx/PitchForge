// PitchWire CRM — domain types
//
// These mirror the migrations in supabase/migrations/. They are hand-written
// rather than generated so the comments explaining *why* a field exists live
// next to it; if you later adopt `supabase gen types`, generate into
// types/supabase.ts and keep this file as the domain layer on top.
//
// String-literal unions match the Postgres enums exactly. A value that drifts
// from the database is a compile error rather than a runtime surprise.

export type CrmEventType =
  | 'INVESTOR_ADDED'
  | 'PITCH_GENERATED'
  | 'PITCH_REGENERATED'
  | 'EMAIL_SENT'
  | 'EMAIL_OPENED'
  | 'FOLLOWUP_SENT'
  | 'REPLIED'
  | 'MEETING_SCHEDULED'
  | 'MEETING_COMPLETED'
  | 'CALL_LOGGED'
  | 'DEMO_GIVEN'
  | 'WARM_INTRO'
  | 'STAGE_CHANGED'
  | 'CAMPAIGN_CHANGED'
  | 'NOTE_ADDED'
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'INVESTMENT_COMMITTED'
  | 'PASS_RECEIVED'
  | 'SEQUENCE_STARTED'
  | 'SEQUENCE_PAUSED'
  | 'SEQUENCE_RESUMED'
  | 'SEQUENCE_STOPPED'
  | 'ARCHIVED';

export type CampaignStatus = 'active' | 'paused' | 'closed';
export type RelationshipStatus = 'active' | 'snoozed' | 'archived';
export type EmailType = 'initial_pitch' | 'followup' | 'sequence_step' | 'manual';
export type TaskStatus = 'pending' | 'completed' | 'snoozed' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export type TaskType =
  | 'followup'
  | 'review_pitch'
  | 'send_followup'
  | 'prepare_meeting'
  | 'call_investor'
  | 'send_deck'
  | 'upload_document'
  | 'custom';

/**
 * Classifies a stage for analytics that must survive renaming. A founder can
 * rename "Invested" to "Closed" and conversion maths keeps working because it
 * keys off `kind`, never the label.
 */
export type StageKind = 'open' | 'won' | 'lost' | 'dormant';

export type Plan = 'free' | 'starter' | 'pro';

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/**
 * A stable handle on a stage whose name the founder can change at will.
 *
 * Set on the ten seeded stages and null on anything a founder builds, which is
 * what lets the automation in migration 0007 stay out of a custom pipeline
 * rather than guessing at it. Never render this — render `name`.
 */
export type StageKey =
  | 'prospect'
  | 'qualified'
  | 'pitch_sent'
  | 'engaged'
  | 'meeting'
  | 'diligence'
  | 'invested'
  | 'passed'
  | 'no_response'
  | 'archived';

export interface PipelineStage {
  id: string;
  owner_id: string;
  name: string;
  position: number;
  color: string;
  kind: StageKind;
  stage_key: StageKey | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  owner_id: string;
  name: string;
  goal: string | null;
  target_amount: number | null;
  currency: string;
  status: CampaignStatus;
  notes: string | null;
  started_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestorRelationship {
  id: string;
  owner_id: string;
  campaign_id: string;
  stage_id: string;
  status: RelationshipStatus;
  /** Null when the founder tracks someone who is not in the shared directory. */
  investor_id: string | number | null;
  /**
   * Contact snapshot taken at the time of the pitch. The `investors` directory
   * is shared and can change underneath the founder; these fields record who
   * was actually approached.
   */
  investor_firm: string;
  investor_contact: string | null;
  investor_email: string | null;
  tags: string[];
  relationship_score: number | null;
  next_followup_at: string | null;
  last_interaction_at: string | null;
  stage_changed_at: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelationshipEvent {
  id: string;
  owner_id: string;
  relationship_id: string;
  event_type: CrmEventType;
  summary: string | null;
  payload: Record<string, unknown>;
  is_manual: boolean;
  /** When it happened, which is not always when it was recorded. */
  occurred_at: string;
  created_at: string;
  created_by: string | null;
}

export interface StageHistoryEntry {
  id: string;
  owner_id: string;
  relationship_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  duration_seconds: number | null;
  changed_at: string;
  changed_by: string | null;
}

export interface GeneratedPitch {
  id: string;
  owner_id: string;
  relationship_id: string | null;
  investor_firm: string | null;
  investor_name: string | null;
  subject: string;
  body: string;
  research_notes: string | null;
  model: string | null;
  revision: number;
  created_at: string;
}

export interface SentEmail {
  id: string;
  owner_id: string;
  relationship_id: string;
  generated_pitch_id: string | null;
  email_type: EmailType;
  to_email: string;
  subject: string;
  body: string;
  provider_message_id: string | null;
  delivery_status: string;
  error_message: string | null;
  sent_at: string;
  opened_at: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  owner_id: string;
  relationship_id: string | null;
  campaign_id: string | null;
  type: TaskType;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelationshipNote {
  id: string;
  owner_id: string;
  relationship_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RelationshipMeeting {
  id: string;
  owner_id: string;
  relationship_id: string;
  title: string | null;
  meeting_type: string;
  scheduled_at: string;
  duration_minutes: number | null;
  location: string | null;
  notes: string | null;
  outcome: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Raw aggregates from the `campaign_stats` view. Rates are derived in the app. */
export interface CampaignStatsRow {
  campaign_id: string;
  owner_id: string;
  name: string;
  status: CampaignStatus;
  target_amount: number | null;
  currency: string;
  total_investors: number;
  investments: number;
  passes: number;
  investors_emailed: number;
  investors_replied: number;
  investors_met: number;
  /** Distinct investors who opened at least one email in the thread. */
  investors_opened: number;
  /**
   * Mean days from first send to first reply, over the investors who replied.
   * Null until somebody has — an average of nothing is not zero.
   */
  avg_days_to_first_reply: number | null;
  emails_sent: number;
  pitches_generated: number;
  last_activity_at: string | null;
}

/** `campaign_stats` with the derived percentages the UI actually renders. */
export interface CampaignStats extends CampaignStatsRow {
  open_rate: number;
  reply_rate: number;
  meeting_rate: number;
  investment_rate: number;
}

// ---------------------------------------------------------------------------
// Composed shapes
// ---------------------------------------------------------------------------

/** A relationship with its stage resolved — what the pipeline board renders. */
export interface RelationshipWithStage extends InvestorRelationship {
  stage: PipelineStage | null;
}

/** What the board and list views receive: stage plus the owning campaign. */
export interface RelationshipCard extends RelationshipWithStage {
  campaign: Pick<Campaign, 'id' | 'name' | 'status'> | null;
}

/**
 * Everything the relationship detail page loads in one round trip.
 *
 * The children stay siblings of the relationship rather than being folded into
 * it: they are separately paginated and separately plan-gated, and flattening
 * would imply they always arrive complete.
 */
export interface RelationshipDetailResponse {
  relationship: RelationshipCard;
  events: RelationshipEvent[];
  notes: RelationshipNote[];
  tasks: Task[];
  meetings: RelationshipMeeting[];
  emails: SentEmail[];
  pitches: GeneratedPitch[];
  stageHistory: StageHistoryEntry[];
  /** Null on Pro, where the timeline is uncapped. */
  historyWindowDays: number | null;
}

/**
 * A row joined to the bare minimum of its relationship. The dashboard lists
 * tasks, meetings and events across every investor, so each line needs a firm
 * name to be meaningful — but not the whole relationship, which would multiply
 * the payload by the number of rows sharing a parent.
 */
export type WithRelationshipRef<T> = T & {
  relationship: Pick<InvestorRelationship, 'id' | 'investor_firm'> | null;
};

export interface DashboardSummary {
  stats: CampaignStats | null;
  stageCounts: Array<{ stage: PipelineStage; count: number }>;
  overdueTasks: Array<WithRelationshipRef<Task>>;
  upcomingTasks: Array<WithRelationshipRef<Task>>;
  upcomingMeetings: Array<WithRelationshipRef<RelationshipMeeting>>;
  recentEvents: Array<WithRelationshipRef<RelationshipEvent>>;
  /** Active relationships with no interaction inside the staleness window. */
  goneQuiet: RelationshipWithStage[];
  /** Echoed from the server so the heading states the window it applied. */
  quietAfterDays: number;
  totalActive: number;
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

/**
 * One investor waiting on the founder, with the numbers the queue sorts by
 * already computed.
 *
 * `daysSincePitch` is server-computed rather than derived in the component
 * because the bucket boundaries (3, 7, 14 days) have to agree with the cron
 * sweep's 14-day threshold, and two implementations of "how many days" that
 * round differently would put an investor in a bucket the sweep disagrees with.
 */
export interface FollowupCandidate {
  relationship: RelationshipCard;
  /** Newest email in the thread, or null if they were added but never pitched. */
  lastEmailAt: string | null;
  lastEmailSubject: string | null;
  /** Newest event of any kind, which is what "last activity" shows. */
  lastActivityAt: string | null;
  lastActivitySummary: string | null;
  /** Whole days since the last send. Null when nothing was ever sent. */
  daysSincePitch: number | null;
  /** How many follow-ups have already gone out, so the copy can escalate. */
  followupCount: number;
  opened: boolean;
  replied: boolean;
}

export type FollowupBucket = 'today' | 'three_to_seven' | 'seven_to_fourteen' | 'over_fourteen';

export interface FollowupsResponse {
  candidates: FollowupCandidate[];
  counts: Record<FollowupBucket, number>;
  total: number;
  /** Echoed so the UI states the same threshold the cron sweep uses. */
  noResponseAfterDays: number;
}
