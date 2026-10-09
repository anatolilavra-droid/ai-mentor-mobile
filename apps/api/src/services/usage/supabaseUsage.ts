import { z } from 'zod';

import { AppError } from '../../errors/AppError.js';
import type { UserDataClientFactory } from '../../lib/supabase.js';
import type { SubscriptionResponse, UsageResponse } from '@ai-mentor/shared';

import {
  quotaRowSchema,
  subscriptionRowSchema,
  type QuotaRow,
} from '../../schemas/usage.schema.js';

import type { Quota, UsageCaller, UsageFeature, UsageGuard } from './UsageGuard.js';

/** Largest token count passed to the database for one request (the function rejects more). */
const MAX_TOKENS_PER_CALL = 1_000_000;

type DbResult = { data: unknown; error: { message: string } | null; status: number };

/** Database failures never grant AI access: the request fails closed. */
function failure(result: DbResult, signal: AbortSignal): AppError {
  if (signal.aborted && signal.reason instanceof AppError) return signal.reason;
  if (result.status === 401 || result.status === 403) {
    return new AppError('UNAUTHORIZED', { cause: result.error });
  }
  return new AppError('SERVICE_UNAVAILABLE', { cause: result.error });
}

function parseQuotaRows(data: unknown): QuotaRow[] {
  const rows = z.array(quotaRowSchema).safeParse(data);
  if (!rows.success) throw new AppError('INTERNAL_ERROR', { cause: rows.error });
  return rows.data;
}

function findFeature(rows: QuotaRow[], feature: UsageFeature): QuotaRow {
  const row = rows.find((candidate) => candidate.feature === feature);
  // A missing limit is a configuration error: refuse rather than allow unlimited use.
  if (!row) throw new AppError('INTERNAL_ERROR');
  return row;
}

const toQuota = (row: QuotaRow): Quota => ({
  used: row.used,
  limit: row.monthly_limit,
  period: 'month',
});

/** The first moment of the next period, as an ISO timestamp (UTC). */
const resetsAt = (row: QuotaRow) => `${row.period_end}T00:00:00.000Z`;

/**
 * Reads quotas and records usage through the database functions, as the
 * calling user. No service role key is involved.
 */
export function createSupabaseUsage(createUserClient: UserDataClientFactory) {
  async function loadQuotas({ accessToken, signal }: UsageCaller): Promise<QuotaRow[]> {
    const result = (await createUserClient(accessToken)
      .rpc('get_my_ai_quotas')
      .abortSignal(signal)) as DbResult;
    if (result.error) throw failure(result, signal);
    return parseQuotaRows(result.data);
  }

  const guard: UsageGuard = {
    async check(input) {
      const row = findFeature(await loadQuotas(input), input.feature);
      const quota = toQuota(row);
      return row.used < row.monthly_limit
        ? { allowed: true, quota }
        : { allowed: false, quota, resetsAt: resetsAt(row) };
    },

    async record(input) {
      const result = (await createUserClient(input.accessToken)
        .rpc('record_my_ai_usage', {
          p_feature: input.feature,
          p_input_tokens: Math.min(input.inputTokens, MAX_TOKENS_PER_CALL),
          p_output_tokens: Math.min(input.outputTokens, MAX_TOKENS_PER_CALL),
        })
        .abortSignal(input.signal)) as DbResult;
      if (result.error) throw failure(result, input.signal);
      return toQuota(findFeature(parseQuotaRows(result.data), input.feature));
    },
  };

  return {
    guard,

    /** GET /api/usage: plan, period and usage for every feature. */
    async getUsage(caller: UsageCaller): Promise<UsageResponse> {
      const rows = await loadQuotas(caller);
      const chat = findFeature(rows, 'chat');
      const codeReview = findFeature(rows, 'code_review');
      return {
        plan: chat.plan,
        period: { start: chat.period_start, end: chat.period_end },
        features: {
          chat: { used: chat.used, limit: chat.monthly_limit },
          code_review: { used: codeReview.used, limit: codeReview.monthly_limit },
        },
      };
    },

    /** GET /api/subscription: the caller's plan; no row means Free. */
    async getSubscription({
      accessToken,
      userId,
      signal,
    }: UsageCaller): Promise<SubscriptionResponse> {
      const result = (await createUserClient(accessToken)
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', userId)
        .abortSignal(signal)
        .maybeSingle()) as DbResult;
      if (result.error) throw failure(result, signal);
      if (result.data === null) return { plan: 'free', status: 'active' };
      const row = subscriptionRowSchema.safeParse(result.data);
      if (!row.success) throw new AppError('INTERNAL_ERROR', { cause: row.error });
      // A canceled subscription gives Free limits (same rule as get_my_ai_quotas).
      return {
        plan: row.data.status === 'active' ? row.data.plan : 'free',
        status: row.data.status,
      };
    },
  };
}

export type SupabaseUsage = ReturnType<typeof createSupabaseUsage>;
