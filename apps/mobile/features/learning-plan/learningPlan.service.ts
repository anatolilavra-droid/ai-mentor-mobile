import {
  LEARNING_PLAN_DETAIL_SELECT,
  LEARNING_PLAN_SUMMARY_SELECT,
  learningPlanDetailSchema,
  learningPlanLimitsRowSchema,
  learningPlanSummarySchema,
  toLearningPlanLimits,
  type LearningPlanDetail,
  type LearningPlanLimits,
  type LearningPlanSummary,
} from '@ai-mentor/shared';
import { z } from 'zod';

import { requireSupabase } from '@/lib/supabase/client';

import { PlanDataError, toPlanDataError } from './learningPlan.errors';

/*
 * Learning plan reads and changes, straight to Supabase with the learner's session.
 * Row Level Security returns and changes only the learner's own rows; the user id
 * filter below is defence in depth and lets the database use its index.
 * New plans are created only by the API (POST /api/ai/learning-plan).
 */

type Response = { data: unknown; error: unknown };

/** Runs one Supabase call; a thrown fetch error counts as a network failure. */
async function run(call: () => PromiseLike<Response>): Promise<unknown> {
  let response: Response;
  try {
    response = await call();
  } catch (error) {
    throw toPlanDataError(error);
  }
  if (response.error) throw toPlanDataError(response.error);
  return response.data;
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new PlanDataError('BAD_DATA', { cause: parsed.error });
  return parsed.data;
}

/** The learner's plans, oldest first, with what progress and the next task need. */
export async function fetchPlans(userId: string): Promise<LearningPlanSummary[]> {
  const data = await run(() =>
    requireSupabase()
      .from('learning_plans')
      .select(LEARNING_PLAN_SUMMARY_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  );
  return parse(z.array(learningPlanSummarySchema), data);
}

/** One plan with its modules and tasks. */
export async function fetchPlan(userId: string, planId: string): Promise<LearningPlanDetail> {
  const data = await run(() =>
    requireSupabase()
      .from('learning_plans')
      .select(LEARNING_PLAN_DETAIL_SELECT)
      .eq('user_id', userId)
      .eq('id', planId)
      .maybeSingle(),
  );
  if (data === null) throw new PlanDataError('NOT_FOUND');
  return parse(learningPlanDetailSchema, data);
}

/** Active plans and this month's generations against the learner's plan (from the database). */
export async function fetchPlanLimits(): Promise<LearningPlanLimits> {
  const data = await run(() => requireSupabase().rpc('get_my_learning_plan_limits'));
  const [row] = parse(z.array(learningPlanLimitsRowSchema).length(1), data);
  return toLearningPlanLimits(row!);
}

const taskResultSchema = z
  .array(
    z.object({
      task_id: z.uuid(),
      plan_id: z.uuid(),
      completed_at: z.string().nullable(),
      done: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    }),
  )
  .length(1);
export type TaskCompletion = z.infer<typeof taskResultSchema>[number];

/** Ticks (or unticks) one task. The time comes from the database clock. */
export async function setTaskCompleted(
  taskId: string,
  completed: boolean,
): Promise<TaskCompletion> {
  const data = await run(() =>
    requireSupabase().rpc('set_learning_task_completed', {
      p_task_id: taskId,
      p_completed: completed,
    }),
  );
  return parse(taskResultSchema, data)[0]!;
}

const archiveResultSchema = z
  .array(z.object({ plan_id: z.uuid(), status: z.literal('archived'), archived_at: z.string() }))
  .length(1);

/** Archives one plan: it becomes read-only and frees its active slot. */
export async function archivePlan(planId: string) {
  const data = await run(() =>
    requireSupabase().rpc('archive_learning_plan', { p_plan_id: planId }),
  );
  return parse(archiveResultSchema, data)[0]!;
}

/** Deletes one plan with its modules and tasks. This month's generation stays counted. */
export async function deletePlan(planId: string): Promise<void> {
  const data = await run(() =>
    requireSupabase().rpc('delete_learning_plan', { p_plan_id: planId }),
  );
  parse(z.literal(true), data);
}
