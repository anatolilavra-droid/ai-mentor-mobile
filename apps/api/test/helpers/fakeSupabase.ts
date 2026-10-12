import { randomUUID } from 'node:crypto';

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

/** Same values as the learning_plan_limits seed in the migration. */
export const LEARNING_PLAN_LIMITS: Record<Plan, { active: number; monthly: number }> = {
  free: { active: 1, monthly: 3 },
  pro: { active: 20, monthly: 30 },
};

/** Active technologies in the fake catalog. */
const CATALOG = new Set(['javascript', 'typescript', 'python', 'html', 'css', 'react', 'nodejs']);

export type FakeGeneration = {
  id: string;
  user_id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'expired';
  technology_id: string;
  goal: string;
  duration_days: number;
  daily_minutes: number;
  plan_id: string | null;
  error_code: string | null;
  meta: Record<string, unknown> | null;
};

export type FakeSupabaseOptions = {
  rows?: FakeRow[];
  subscriptions?: { user_id: string; plan: Plan; status: 'active' | 'canceled' }[];
  /** Onboarding technologies per user (user_technologies). */
  technologies?: Record<string, string[]>;
  /** Starting usage this month, per user and feature. */
  usage?: Record<string, Partial<Record<Feature, number>>>;
  /** Simulates a PostgREST or network failure for table queries. */
  failure?: Failure;
  /** Simulates a failure of the usage functions (rpc). */
  rpcFailure?: Failure;
  /** Simulates a failure of one learning plan function. */
  planRpcFailure?: Partial<Record<string, Failure>>;
  /** Learning plans that exist already (full rows with embedded modules and tasks). */
  learningPlans?: FakeRow[];
  /** Successful generations this month, per user (they count against the monthly limit). */
  planGenerations?: Record<string, number>;
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
    user_technologies: Object.entries(options.technologies ?? {}).flatMap(([user, ids]) =>
      ids.map((technology_id) => ({ user_id: user, technology_id })),
    ),
    learning_plans: options.learningPlans ?? [],
  };
  const generations: FakeGeneration[] = Object.entries(options.planGenerations ?? {}).flatMap(
    ([user, count]) =>
      Array.from({ length: count }, () => ({
        id: randomUUID(),
        user_id: user,
        status: 'succeeded' as const,
        technology_id: 'javascript',
        goal: 'learn_javascript',
        duration_days: 7,
        daily_minutes: 30,
        plan_id: null,
        error_code: null,
        meta: null,
      })),
  );
  const ownerColumn: Record<string, string> = {
    profiles: 'id',
    subscriptions: 'user_id',
    user_technologies: 'user_id',
    learning_plans: 'user_id',
  };
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

  const planOf = (user: string): Plan => {
    const subscription = (tables.subscriptions ?? []).find(
      (row) => row.user_id === user && row.status === 'active',
    );
    return (subscription?.plan as Plan | undefined) ?? 'free';
  };

  /** get_my_learning_plan_limits(): pending reservations count as active plans and generations. */
  const planLimits = (user: string) => {
    const plan = planOf(user);
    const pending = generations.filter((g) => g.user_id === user && g.status === 'pending').length;
    const active = (tables.learning_plans ?? []).filter(
      (row) => row.user_id === user && row.status === 'active',
    ).length;
    const succeeded = generations.filter(
      (g) => g.user_id === user && g.status === 'succeeded',
    ).length;
    const period = currentPeriod();
    return {
      plan,
      active_used: active + pending,
      active_limit: LEARNING_PLAN_LIMITS[plan].active,
      generations_used: succeeded + pending,
      generations_limit: LEARNING_PLAN_LIMITS[plan].monthly,
      period_start: period.start,
      period_end: period.end,
    };
  };

  class RpcError extends Error {
    constructor(
      message: string,
      readonly details: string | null = null,
    ) {
      super(message);
    }
  }

  const planRpc = (name: string, args: Record<string, unknown>, sub: string): unknown => {
    switch (name) {
      case 'get_my_learning_plan_limits':
        return [planLimits(sub)];
      case 'begin_learning_plan_generation': {
        if (!CATALOG.has(String(args.p_technology_id))) throw new RpcError('UNKNOWN_TECHNOLOGY');
        const limits = planLimits(sub);
        if (limits.active_used >= limits.active_limit) {
          throw new RpcError(
            'PLAN_LIMIT_REACHED',
            JSON.stringify({ used: limits.active_used, limit: limits.active_limit }),
          );
        }
        if (limits.generations_used >= limits.generations_limit) {
          throw new RpcError(
            'GENERATION_LIMIT_REACHED',
            JSON.stringify({
              used: limits.generations_used,
              limit: limits.generations_limit,
              resetsAt: limits.period_end,
            }),
          );
        }
        const generation: FakeGeneration = {
          id: randomUUID(),
          user_id: sub,
          status: 'pending',
          technology_id: String(args.p_technology_id),
          goal: String(args.p_goal),
          duration_days: Number(args.p_duration_days),
          daily_minutes: Number(args.p_daily_minutes),
          plan_id: null,
          error_code: null,
          meta: null,
        };
        generations.push(generation);
        return [{ generation_id: generation.id, ...planLimits(sub) }];
      }
      case 'complete_learning_plan_generation': {
        const generation = generations.find(
          (g) => g.id === args.p_generation_id && g.user_id === sub && g.status === 'pending',
        );
        if (!generation) throw new RpcError('GENERATION_NOT_PENDING');
        const draft = args.p_plan as {
          title: string;
          summary: string;
          nextStep: string;
          reviewQuestions: string[];
          modules: { position: number; title: string; description: string; objectives: string[] }[];
          tasks: {
            module: number;
            position: number;
            day: number;
            kind: string;
            title: string;
            description: string;
            estimatedMinutes: number;
          }[];
        };
        if (draft.tasks.some((task) => task.day > generation.duration_days)) {
          throw new RpcError('INVALID_PLAN');
        }
        const planId = randomUUID();
        const now = new Date().toISOString();
        const modules = draft.modules.map((module) => ({
          id: randomUUID(),
          plan_id: planId,
          user_id: sub,
          position: module.position,
          title: module.title,
          description: module.description,
          objectives: module.objectives,
        }));
        const meta = args.p_meta as Record<string, unknown>;
        tables.learning_plans!.push({
          id: planId,
          user_id: sub,
          technology_id: generation.technology_id,
          goal: generation.goal,
          goal_details: (args.p_goal_details as string | null) ?? null,
          experience_level: args.p_experience_level,
          daily_minutes: generation.daily_minutes,
          duration_days: generation.duration_days,
          title: draft.title,
          summary: draft.summary,
          review_questions: draft.reviewQuestions,
          next_step: draft.nextStep,
          status: 'active',
          prompt_version: meta.promptVersion,
          provider: meta.provider,
          model: meta.model,
          created_at: now,
          updated_at: now,
          archived_at: null,
          learning_modules: modules,
          learning_tasks: draft.tasks.map((task) => ({
            id: randomUUID(),
            plan_id: planId,
            module_id: modules.find((module) => module.position === task.module)!.id,
            user_id: sub,
            day_number: task.day,
            position: task.position,
            kind: task.kind,
            title: task.title,
            description: task.description,
            estimated_minutes: task.estimatedMinutes,
            completed_at: null,
          })),
        });
        generation.status = 'succeeded';
        generation.plan_id = planId;
        generation.meta = meta;
        return planId;
      }
      case 'fail_learning_plan_generation': {
        const generation = generations.find(
          (g) => g.id === args.p_generation_id && g.user_id === sub && g.status === 'pending',
        );
        if (!generation) return false;
        generation.status = 'failed';
        generation.error_code = String(args.p_error_code);
        return true;
      }
      default:
        return undefined;
    }
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
        order: () => query,
        limit: (count: number) => {
          query.filtered = query.filtered.slice(0, count);
          return query;
        },
        maybeSingle: () => settle(options.failure, () => query.filtered[0] ?? null),
        // Awaiting the query itself returns every visible row (a list select).
        then: <T>(
          resolve: (value: Awaited<ReturnType<typeof settle>>) => T,
          reject?: (reason: unknown) => T,
        ) => settle(options.failure, () => query.filtered).then(resolve, reject),
      };
      return query;
    };

    const rpc = (name: string, args?: Record<string, unknown>) => ({
      abortSignal: async () => {
        rpcCalls.push({ name, args, sub });
        const planFailure = options.planRpcFailure?.[name];
        if (name.includes('learning')) {
          // Synchronous like the per-user lock in the database: check and reserve at once.
          if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
          if (planFailure) {
            return {
              data: null,
              error: { message: planFailure.message },
              status: planFailure.status,
            };
          }
          try {
            return { data: planRpc(name, args ?? {}, sub), error: null, status: 200 };
          } catch (error) {
            if (!(error instanceof RpcError)) throw error;
            return {
              data: null,
              error: { message: error.message, code: 'P0001', details: error.details },
              status: 400,
            };
          }
        }
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

  return { factory, accessTokens, filters, rpcCalls, usage, generations, tables };
}
