import type { Usage } from '../../schemas/chat.schema.js';

export type UsageFeature = 'chat' | 'code_review' | 'learning_plan' | 'project_breakdown';

export type Quota = NonNullable<Usage['quota']>;

export type UsageDecision = { allowed: true; quota: Quota | null } | { allowed: false };

/**
 * Plan and usage check before every AI call. The plan always comes from the
 * database (Phase 5), never from the client.
 */
export interface UsageGuard {
  check(input: { userId: string; feature: UsageFeature }): Promise<UsageDecision>;
  record(input: {
    userId: string;
    feature: UsageFeature;
    inputTokens: number;
    outputTokens: number;
  }): Promise<void>;
}
