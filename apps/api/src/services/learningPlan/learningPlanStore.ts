import {
  LEARNING_PLAN_DETAIL_SELECT,
  learningPlanDetailSchema,
  learningPlanLimitsRowSchema,
  toLearningPlanLimits,
  type LearningPlanDetail,
  type LearningPlanLimits,
  type ParsedLearningPlanRequest,
} from '@ai-mentor/shared';
import { z } from 'zod';

import { AppError } from '../../errors/AppError.js';
import type { UserDataClientFactory } from '../../lib/supabase.js';

import type { PlanDraft } from './finalizePlan.js';

/** Who is asking. The token makes every database call run as this user (RLS). */
export type PlanCaller = { accessToken: string; signal: AbortSignal };

type DbError = { message: string; code?: string; details?: string | null };
type DbResult = { data: unknown; error: DbError | null; status: number };

const limitDetailSchema = z.object({
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  resetsAt: z.iso.date().optional(),
});

const beginRowSchema = learningPlanLimitsRowSchema.extend({ generation_id: z.uuid() });

const progressRowsSchema = z.array(
  z.object({
    id: z.uuid(),
    learning_modules: z.array(z.object({ id: z.uuid(), title: z.string() })),
    learning_tasks: z.array(z.object({ module_id: z.uuid(), completed_at: z.string().nullable() })),
  }),
);

/** How long a release of a reservation may take, independent of the request. */
const RELEASE_TIMEOUT_MS = 5_000;

/** The JSON detail a limit error carries (set by the database functions). */
function limitDetail(error: DbError) {
  try {
    const parsed = limitDetailSchema.safeParse(JSON.parse(error.details ?? ''));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Turns a database error into a typed API error. Business rules raised by the
 * functions arrive as stable messages; anything else fails closed.
 */
function toAppError(result: DbResult, signal: AbortSignal): AppError {
  if (signal.aborted && signal.reason instanceof AppError) return signal.reason;
  const error = result.error;
  switch (error?.message) {
    case 'PLAN_LIMIT_REACHED': {
      const detail = limitDetail(error);
      return new AppError('PLAN_LIMIT_REACHED', {
        cause: error,
        ...(detail
          ? { planLimit: { kind: 'active_plans', used: detail.used, limit: detail.limit } }
          : {}),
      });
    }
    case 'GENERATION_LIMIT_REACHED': {
      const detail = limitDetail(error);
      return new AppError('GENERATION_LIMIT_REACHED', {
        cause: error,
        ...(detail
          ? {
              planLimit: {
                kind: 'monthly_generations',
                used: detail.used,
                limit: detail.limit,
                ...(detail.resetsAt ? { resetsAt: `${detail.resetsAt}T00:00:00.000Z` } : {}),
              },
            }
          : {}),
      });
    }
    case 'UNKNOWN_TECHNOLOGY':
      return new AppError('VALIDATION_ERROR', {
        cause: error,
        details: [{ path: 'technologyId', message: 'unknownTechnology' }],
      });
    case 'INVALID_REQUEST':
      return new AppError('VALIDATION_ERROR', { cause: error });
    // The answer broke a database rule the schema did not catch.
    case 'INVALID_PLAN':
      return new AppError('AI_INVALID_RESPONSE', { cause: error });
    // The reservation expired while the AI was answering (more than 3 minutes).
    case 'GENERATION_NOT_PENDING':
      return new AppError('TIMEOUT', { cause: error });
  }
  if (result.status === 401 || result.status === 403) {
    return new AppError('UNAUTHORIZED', { cause: error });
  }
  return new AppError('SERVICE_UNAVAILABLE', { cause: error });
}

/**
 * Learning plan data for the API, through the database functions and RLS, as the
 * calling user. No service role key is involved.
 */
export function createLearningPlanStore(createUserClient: UserDataClientFactory) {
  return {
    /** Reserves a slot (active plans and monthly generations) before the AI call. */
    async begin(
      caller: PlanCaller,
      request: ParsedLearningPlanRequest,
    ): Promise<{ generationId: string; limits: LearningPlanLimits }> {
      const result = (await createUserClient(caller.accessToken)
        .rpc('begin_learning_plan_generation', {
          p_technology_id: request.technologyId,
          p_goal: request.goal,
          p_duration_days: request.durationDays,
          p_daily_minutes: request.dailyMinutes,
        })
        .abortSignal(caller.signal)) as DbResult;
      if (result.error) throw toAppError(result, caller.signal);
      const rows = z.array(beginRowSchema).length(1).safeParse(result.data);
      if (!rows.success) throw new AppError('INTERNAL_ERROR', { cause: rows.error });
      const row = rows.data[0]!;
      return { generationId: row.generation_id, limits: toLearningPlanLimits(row) };
    },

    /** Saves the plan and counts the generation, in one database transaction. */
    async complete(
      caller: PlanCaller,
      input: {
        generationId: string;
        experienceLevel: string;
        goalDetails: string | null;
        draft: PlanDraft;
        meta: {
          provider: string;
          model: string;
          promptVersion: string;
          inputTokens: number;
          outputTokens: number;
          latencyMs: number;
        };
      },
    ): Promise<string> {
      const result = (await createUserClient(caller.accessToken)
        .rpc('complete_learning_plan_generation', {
          p_generation_id: input.generationId,
          p_experience_level: input.experienceLevel,
          p_goal_details: input.goalDetails,
          p_plan: input.draft,
          p_meta: input.meta,
        })
        .abortSignal(caller.signal)) as DbResult;
      if (result.error) throw toAppError(result, caller.signal);
      const planId = z.uuid().safeParse(result.data);
      if (!planId.success) throw new AppError('INTERNAL_ERROR', { cause: planId.error });
      return planId.data;
    },

    /**
     * Releases a reservation after a failed generation. Runs with its own short
     * timeout: the request may already be aborted. Never throws.
     */
    async release(accessToken: string, generationId: string, errorCode: string) {
      try {
        const result = (await createUserClient(accessToken)
          .rpc('fail_learning_plan_generation', {
            p_generation_id: generationId,
            p_error_code: errorCode,
          })
          .abortSignal(AbortSignal.timeout(RELEASE_TIMEOUT_MS))) as DbResult;
        return result.error ? 'error' : result.data === true ? 'released' : 'not_pending';
      } catch {
        return 'error';
      }
    },

    /** The saved plan with its modules and tasks (RLS: the caller's own only). */
    async fetchPlan(caller: PlanCaller, planId: string): Promise<LearningPlanDetail> {
      const result = (await createUserClient(caller.accessToken)
        .from('learning_plans')
        .select(LEARNING_PLAN_DETAIL_SELECT)
        .eq('id', planId)
        .abortSignal(caller.signal)
        .maybeSingle()) as DbResult;
      if (result.error) throw toAppError(result, caller.signal);
      const plan = learningPlanDetailSchema.safeParse(result.data);
      if (!plan.success) throw new AppError('INTERNAL_ERROR', { cause: plan.error });
      return plan.data;
    },

    /**
     * What the learner already did with this technology (last 5 plans): counts and
     * titles of fully completed modules. Personalization only.
     */
    async progressSummary(caller: PlanCaller, technologyId: string) {
      const result = (await createUserClient(caller.accessToken)
        .from('learning_plans')
        .select('id, learning_modules(id, title), learning_tasks(module_id, completed_at)')
        .eq('technology_id', technologyId)
        .order('created_at', { ascending: false })
        .limit(5)
        .abortSignal(caller.signal)) as DbResult;
      if (result.error) throw toAppError(result, caller.signal);
      const plans = progressRowsSchema.safeParse(result.data);
      if (!plans.success) throw new AppError('INTERNAL_ERROR', { cause: plans.error });

      let completedTasks = 0;
      const completedModules: string[] = [];
      for (const plan of plans.data) {
        completedTasks += plan.learning_tasks.filter((task) => task.completed_at !== null).length;
        for (const module of plan.learning_modules) {
          const tasks = plan.learning_tasks.filter((task) => task.module_id === module.id);
          if (tasks.length > 0 && tasks.every((task) => task.completed_at !== null)) {
            completedModules.push(module.title.slice(0, 120));
          }
        }
      }
      return {
        previousPlans: plans.data.length,
        completedTasks,
        completedModules: completedModules.slice(0, 10),
      };
    },
  };
}

export type LearningPlanStore = ReturnType<typeof createLearningPlanStore>;
