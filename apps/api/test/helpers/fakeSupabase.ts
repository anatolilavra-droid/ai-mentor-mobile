import { decodeJwt } from 'jose';

import type { UserDataClient, UserDataClientFactory } from '../../src/lib/supabase.js';

import { USER_A, USER_B } from './tokens.js';

export type FakeRow = Record<string, unknown>;
type Feature = 'chat' | 'code_review';
type Plan = 'free' | 'pro';

export function profileRow(id: string, overrides: FakeRow = {}): FakeRow {
  return {
    id,
    display_name: id === USER_A ? 'Alice' : 'Bob',
    experience_level: 'beginner',
    primary_goal: 'learn_javascript',
    daily_minutes: 30,
    ui_language: 'en',
    onboarding_completed: true,
    ...overrides,
  };
}

/** Same values as the plan_limits seed in the migration. */
export const PLAN_LIMITS: Record<Plan, Record<Feature, number>> = {
  free: { chat: 30, code_review: 10 },
  pro: { chat: 500, code_review: 200 },
};

type Failure = { status: number; message: string };

export type FakeSupabaseOptions = {
  rows?: FakeRow[];
  subscriptions?: { user_id: string; plan: Plan; status: 'active' | 'canceled' }[];
  /** Starting usage this month, per user and feature. */
  usage?: Record<string, Partial<Record<Feature, number>>>;
  /** Simulates a PostgREST or network failure for table queries. */
  failure?: Failure;
  /** Simulates a failure of the usage functions (rpc). */
  rpcFailure?: Failure;
  delayMs?: number;
};

function currentPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * A Supabase stand-in that emulates RLS: a client only ever sees rows that
 * belong to the `sub` of the token it was created with, and the usage
 * functions only read and change the caller's own counters, like
 * get_my_ai_quotas / record_my_ai_usage in the database.
 */
export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const tables: Record<string, FakeRow[]> = {
    profiles: options.rows ?? [profileRow(USER_A), profileRow(USER_B)],
    subscriptions: options.subscriptions ?? [],
  };
  const ownerColumn: Record<string, string> = { profiles: 'id', subscriptions: 'user_id' };
  const usage = new Map<string, Record<Feature, number>>(
    Object.entries(options.usage ?? {}).map(([user, counts]) => [
      user,
      { chat: counts.chat ?? 0, code_review: counts.code_review ?? 0 },
    ]),
  );
  const accessTokens: string[] = [];
  const filters: { table: string; column: string; value: unknown }[] = [];
  const rpcCalls: { name: string; args: unknown; sub: string }[] = [];

  const settle = async <T>(failure: Failure | undefined, data: () => T) => {
    if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    if (failure) return { data: null, error: { message: failure.message }, status: failure.status };
    return { data: data(), error: null, status: 200 };
  };

  const quotas = (user: string) => {
    const subscription = (tables.subscriptions ?? []).find(
      (row) => row.user_id === user && row.status === 'active',
    );
    const plan = (subscription?.plan as Plan | undefined) ?? 'free';
    const counts = usage.get(user) ?? { chat: 0, code_review: 0 };
    const period = currentPeriod();
    return (['chat', 'code_review'] as const).map((feature) => ({
      feature,
      plan,
      used: counts[feature],
      monthly_limit: PLAN_LIMITS[plan][feature],
      period_start: period.start,
      period_end: period.end,
    }));
  };

  const factory: UserDataClientFactory = (accessToken) => {
    accessTokens.push(accessToken);
    const sub = String(decodeJwt(accessToken).sub);

    const from = (table: string) => {
      const owner = ownerColumn[table] ?? 'id';
      const query = {
        filtered: (tables[table] ?? []).filter((row) => row[owner] === sub),
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters.push({ table, column, value });
          query.filtered = query.filtered.filter((row) => row[column] === value);
          return query;
        },
        abortSignal: () => query,
        maybeSingle: () => settle(options.failure, () => query.filtered[0] ?? null),
      };
      return query;
    };

    const rpc = (name: string, args?: Record<string, unknown>) => ({
      abortSignal: () => {
        rpcCalls.push({ name, args, sub });
        return settle(options.rpcFailure, () => {
          if (name === 'get_my_ai_quotas') return quotas(sub);
          if (name === 'record_my_ai_usage') {
            const feature = args?.p_feature as Feature;
            const counts = usage.get(sub) ?? { chat: 0, code_review: 0 };
            counts[feature] += 1;
            usage.set(sub, counts);
            return quotas(sub).filter((row) => row.feature === feature);
          }
          throw new Error(`Unknown function ${name}`);
        });
      },
    });

    return { from, rpc } as unknown as UserDataClient;
  };

  return { factory, accessTokens, filters, rpcCalls, usage };
}
