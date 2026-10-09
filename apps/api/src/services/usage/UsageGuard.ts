import type { Quota, UsageFeature } from '@ai-mentor/shared';

/** Quota of one feature and the features with a monthly limit (plan_limits in the database). */
export type { Quota, UsageFeature };

export type UsageDecision =
  { allowed: true; quota: Quota } | { allowed: false; quota: Quota; resetsAt: string };

/** Who is asking. The token makes every database call run as this user (RLS). */
export type UsageCaller = { userId: string; accessToken: string; signal: AbortSignal };

/**
 * Plan and usage check around every AI call. The plan always comes from the
 * database, never from the client.
 */
export interface UsageGuard {
  /** Reads the caller's quota for a feature before the AI call. */
  check(input: UsageCaller & { feature: UsageFeature }): Promise<UsageDecision>;
  /** Counts one successful AI call and returns the new quota. */
  record(
    input: UsageCaller & { feature: UsageFeature; inputTokens: number; outputTokens: number },
  ): Promise<Quota>;
}
