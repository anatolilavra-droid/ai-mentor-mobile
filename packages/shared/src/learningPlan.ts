import { z } from 'zod';

import {
  AI_PROVIDERS,
  CUSTOM_GOAL_DETAILS_MAX,
  DAILY_MINUTES_MAX,
  DAILY_MINUTES_MIN,
  MODULE_DESCRIPTION_MAX,
  MODULE_OBJECTIVE_MAX,
  MODULE_TITLE_MAX,
  PLAN_DURATION_DAYS,
  PLAN_MAX_MODULES,
  PLAN_MAX_OBJECTIVES,
  PLAN_MAX_REVIEW_QUESTIONS,
  PLAN_MAX_TASKS,
  PLAN_NEXT_STEP_MAX,
  PLAN_REVIEW_QUESTION_MAX,
  PLAN_STATUSES,
  PLAN_SUMMARY_MAX,
  PLAN_TASK_KINDS,
  PLAN_TITLE_MAX,
  REVIEW_CONFIDENCE,
  TASK_DESCRIPTION_MAX,
  TASK_TITLE_MAX,
  PLANS,
} from './constants.js';
import { experienceLevelSchema, primaryGoalSchema, technologyIdSchema } from './profile.js';

export const planDurationDaysSchema = z.literal(PLAN_DURATION_DAYS);
export const planStatusSchema = z.enum(PLAN_STATUSES);
export const planTaskKindSchema = z.enum(PLAN_TASK_KINDS);

/** POST /api/ai/learning-plan. The user comes from the verified token, never from the body. */
export const learningPlanRequestSchema = z
  .object({
    technologyId: technologyIdSchema,
    goal: primaryGoalSchema,
    goalDetails: z
      .string()
      .trim()
      .max(CUSTOM_GOAL_DETAILS_MAX)
      .nullable()
      .default(null)
      .transform((details) => (details ? details : null)),
    durationDays: planDurationDaysSchema,
    dailyMinutes: z.number().int().min(DAILY_MINUTES_MIN).max(DAILY_MINUTES_MAX),
  })
  .strict();
export type LearningPlanRequest = z.input<typeof learningPlanRequestSchema>;
export type ParsedLearningPlanRequest = z.output<typeof learningPlanRequestSchema>;

const text = (max: number) => z.string().trim().min(1).max(max);

/**
 * The structured answer the AI must return. Deliberately flat (modules and tasks
 * side by side, tasks point to a module by its 1-based number) so the schema stays
 * shallow for the provider. Anything else is rejected.
 */
export const learningPlanOutputSchema = z
  .object({
    title: text(PLAN_TITLE_MAX),
    summary: text(PLAN_SUMMARY_MAX),
    modules: z
      .array(
        z
          .object({
            title: text(MODULE_TITLE_MAX),
            description: text(MODULE_DESCRIPTION_MAX),
            objectives: z.array(text(MODULE_OBJECTIVE_MAX)).max(PLAN_MAX_OBJECTIVES),
          })
          .strict(),
      )
      .min(1)
      .max(PLAN_MAX_MODULES),
    tasks: z
      .array(
        z
          .object({
            module: z.number().int().min(1).max(PLAN_MAX_MODULES),
            day: z
              .number()
              .int()
              .min(1)
              .max(Math.max(...PLAN_DURATION_DAYS)),
            kind: planTaskKindSchema,
            title: text(TASK_TITLE_MAX),
            description: text(TASK_DESCRIPTION_MAX),
            estimatedMinutes: z.number().int().min(1).max(DAILY_MINUTES_MAX),
          })
          .strict(),
      )
      .min(1)
      .max(PLAN_MAX_TASKS),
    reviewQuestions: z.array(text(PLAN_REVIEW_QUESTION_MAX)).max(PLAN_MAX_REVIEW_QUESTIONS),
    nextStep: text(PLAN_NEXT_STEP_MAX),
    confidence: z.enum(REVIEW_CONFIDENCE),
  })
  .strict()
  .superRefine((plan, ctx) => {
    plan.tasks.forEach((task, index) => {
      if (task.module > plan.modules.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['tasks', index, 'module'],
          message: 'Unknown module',
        });
      }
    });
  });
export type LearningPlanOutput = z.infer<typeof learningPlanOutputSchema>;

/*
 * Stored rows, as Supabase (PostgREST) returns them. Not strict: a column added by a
 * later migration must not break older app builds. Timestamps are kept as strings.
 */
const timestamp = z.string().min(1);

export const learningTaskRowSchema = z.object({
  id: z.uuid(),
  plan_id: z.uuid(),
  module_id: z.uuid(),
  day_number: z.number().int().min(1),
  position: z.number().int().min(1),
  kind: planTaskKindSchema,
  title: z.string(),
  description: z.string(),
  estimated_minutes: z.number().int().min(1),
  completed_at: timestamp.nullable(),
});
export type LearningTaskRow = z.infer<typeof learningTaskRowSchema>;

export const learningModuleRowSchema = z.object({
  id: z.uuid(),
  plan_id: z.uuid(),
  position: z.number().int().min(1),
  title: z.string(),
  description: z.string(),
  objectives: z.array(z.string()),
});
export type LearningModuleRow = z.infer<typeof learningModuleRowSchema>;

export const learningPlanRowSchema = z.object({
  id: z.uuid(),
  technology_id: technologyIdSchema,
  goal: primaryGoalSchema,
  goal_details: z.string().nullable(),
  experience_level: experienceLevelSchema,
  daily_minutes: z.number().int(),
  duration_days: planDurationDaysSchema,
  title: z.string(),
  summary: z.string(),
  review_questions: z.array(z.string()),
  next_step: z.string(),
  status: planStatusSchema,
  prompt_version: z.string(),
  provider: z.string(),
  model: z.string(),
  created_at: timestamp,
  updated_at: timestamp,
  archived_at: timestamp.nullable(),
});
export type LearningPlanRow = z.infer<typeof learningPlanRowSchema>;

/** A plan with its modules and tasks (`select('*, learning_modules(*), learning_tasks(*)')`). */
export const learningPlanDetailSchema = learningPlanRowSchema.extend({
  learning_modules: z.array(learningModuleRowSchema),
  learning_tasks: z.array(learningTaskRowSchema),
});
export type LearningPlanDetail = z.infer<typeof learningPlanDetailSchema>;

/** PostgREST select of one plan with everything (details screen, API response). */
export const LEARNING_PLAN_DETAIL_SELECT = '*, learning_modules(*), learning_tasks(*)';

/**
 * PostgREST select of the plan list (Learn, Home): enough for progress and the next
 * task, without descriptions, so many plans stay a small download.
 */
export const LEARNING_PLAN_SUMMARY_SELECT = [
  'id, technology_id, goal, duration_days, daily_minutes, title, status',
  'created_at, updated_at, archived_at',
  'learning_modules(id, position, title)',
  'learning_tasks(id, module_id, day_number, position, kind, title, estimated_minutes, completed_at)',
].join(', ');

export const learningPlanSummarySchema = learningPlanRowSchema
  .pick({
    id: true,
    technology_id: true,
    goal: true,
    duration_days: true,
    daily_minutes: true,
    title: true,
    status: true,
    created_at: true,
    updated_at: true,
    archived_at: true,
  })
  .extend({
    learning_modules: z.array(
      learningModuleRowSchema.pick({ id: true, position: true, title: true }),
    ),
    learning_tasks: z.array(
      learningTaskRowSchema.pick({
        id: true,
        module_id: true,
        day_number: true,
        position: true,
        kind: true,
        title: true,
        estimated_minutes: true,
        completed_at: true,
      }),
    ),
  });
export type LearningPlanSummary = z.infer<typeof learningPlanSummarySchema>;

/** One row of get_my_learning_plan_limits() / begin_learning_plan_generation(). */
export const learningPlanLimitsRowSchema = z.object({
  plan: z.enum(PLANS),
  active_used: z.number().int().nonnegative(),
  active_limit: z.number().int().nonnegative(),
  generations_used: z.number().int().nonnegative(),
  generations_limit: z.number().int().nonnegative(),
  period_start: z.iso.date(),
  period_end: z.iso.date(),
});
export type LearningPlanLimitsRow = z.infer<typeof learningPlanLimitsRowSchema>;

export const learningPlanLimitsSchema = z
  .object({
    plan: z.enum(PLANS),
    activeUsed: z.number().int().nonnegative(),
    activeLimit: z.number().int().nonnegative(),
    generationsUsed: z.number().int().nonnegative(),
    generationsLimit: z.number().int().nonnegative(),
    periodStart: z.iso.date(),
    periodEnd: z.iso.date(),
  })
  .strict();
export type LearningPlanLimits = z.infer<typeof learningPlanLimitsSchema>;

export function toLearningPlanLimits(row: LearningPlanLimitsRow): LearningPlanLimits {
  return {
    plan: row.plan,
    activeUsed: row.active_used,
    activeLimit: row.active_limit,
    generationsUsed: row.generations_used,
    generationsLimit: row.generations_limit,
    periodStart: row.period_start,
    periodEnd: row.period_end,
  };
}

/** 200 of POST /api/ai/learning-plan: the saved plan, as the app also reads it from Supabase. */
export const learningPlanResponseSchema = z
  .object({
    plan: learningPlanDetailSchema,
    limits: learningPlanLimitsSchema,
    provider: z.enum(AI_PROVIDERS),
    promptVersion: z.string().min(1),
    requestId: z.string(),
    usage: z
      .object({
        inputTokens: z.number().int().nonnegative(),
        outputTokens: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();
export type LearningPlanResponse = z.infer<typeof learningPlanResponseSchema>;

/** The task fields progress needs: works for full rows and the list's smaller rows. */
type ProgressTask = Pick<LearningTaskRow, 'module_id' | 'day_number' | 'position' | 'completed_at'>;

export type PlanProgress<T extends ProgressTask = LearningTaskRow> = {
  done: number;
  total: number;
  /** 0..100, rounded down so 100 means really everything is done. */
  percent: number;
  completed: boolean;
  /** The day of the next open task; null when every task is done. */
  currentDay: number | null;
  nextTask: T | null;
  modules: { moduleId: string; done: number; total: number }[];
};

const byDayThenPosition = (a: ProgressTask, b: ProgressTask) =>
  a.day_number - b.day_number || a.position - b.position;

/** Progress of one plan: every task weighs the same. Pure, so app, API and tests agree. */
export function computePlanProgress<T extends ProgressTask>(plan: {
  learning_modules: readonly Pick<LearningModuleRow, 'id' | 'position'>[];
  learning_tasks: readonly T[];
}): PlanProgress<T> {
  const tasks = [...plan.learning_tasks].sort(byDayThenPosition);
  const done = tasks.filter((task) => task.completed_at !== null).length;
  const nextTask = tasks.find((task) => task.completed_at === null) ?? null;
  const modules = [...plan.learning_modules]
    .sort((a, b) => a.position - b.position)
    .map((module) => {
      const own = tasks.filter((task) => task.module_id === module.id);
      return {
        moduleId: module.id,
        done: own.filter((task) => task.completed_at !== null).length,
        total: own.length,
      };
    });
  return {
    done,
    total: tasks.length,
    percent: tasks.length === 0 ? 0 : Math.floor((done / tasks.length) * 100),
    completed: tasks.length > 0 && done === tasks.length,
    currentDay: nextTask?.day_number ?? null,
    nextTask,
    modules,
  };
}

/**
 * The plan Home shows: the oldest active plan (created_at, then id). Deterministic,
 * and with one active plan on Free it is simply that plan.
 */
export function selectPrimaryPlan<T extends Pick<LearningPlanRow, 'id' | 'status' | 'created_at'>>(
  plans: readonly T[],
): T | null {
  const active = plans.filter((plan) => plan.status === 'active');
  active.sort(
    (a, b) =>
      Date.parse(a.created_at) - Date.parse(b.created_at) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return active[0] ?? null;
}
