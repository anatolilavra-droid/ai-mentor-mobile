import { describe, expect, it } from 'vitest';

import {
  PLAN_MAX_MODULES,
  PLAN_MAX_TASKS,
  computePlanProgress,
  errorResponseSchema,
  learningPlanDetailSchema,
  learningPlanOutputSchema,
  learningPlanRequestSchema,
  selectPrimaryPlan,
  type LearningPlanDetail,
  type LearningPlanOutput,
} from '../src/index.js';

const request = {
  technologyId: 'javascript',
  goal: 'learn_javascript',
  goalDetails: '  I want to build a small game  ',
  durationDays: 14,
  dailyMinutes: 30,
};

const output: LearningPlanOutput = {
  title: 'JavaScript in two weeks',
  summary: 'From variables to a tiny game.',
  modules: [
    { title: 'Basics', description: 'Values and variables.', objectives: ['Use const'] },
    { title: 'Functions', description: 'Small functions.', objectives: [] },
  ],
  tasks: [
    {
      module: 1,
      day: 1,
      kind: 'learn',
      title: 'Variables',
      description: 'Read.',
      estimatedMinutes: 20,
    },
    {
      module: 2,
      day: 2,
      kind: 'practice',
      title: 'Add',
      description: 'Write add().',
      estimatedMinutes: 25,
    },
  ],
  reviewQuestions: ['What is a variable?'],
  nextStep: 'Start with day 1.',
  confidence: 'high',
};

describe('learningPlanRequestSchema', () => {
  it('accepts only 7, 14 or 28 days and trims the goal details', () => {
    const parsed = learningPlanRequestSchema.parse(request);
    expect(parsed.goalDetails).toBe('I want to build a small game');
    for (const durationDays of [7, 14, 28]) {
      expect(learningPlanRequestSchema.safeParse({ ...request, durationDays }).success).toBe(true);
    }
    for (const durationDays of [0, 1, 21, 30, 56, '14']) {
      expect(learningPlanRequestSchema.safeParse({ ...request, durationDays }).success).toBe(false);
    }
  });

  it('turns empty goal details into null and allows them to be left out', () => {
    expect(
      learningPlanRequestSchema.parse({ ...request, goalDetails: '   ' }).goalDetails,
    ).toBeNull();
    const withoutDetails: Record<string, unknown> = { ...request };
    delete withoutDetails.goalDetails;
    expect(learningPlanRequestSchema.parse(withoutDetails).goalDetails).toBeNull();
  });

  it('rejects a user id, unknown fields, long details and bad minutes', () => {
    expect(learningPlanRequestSchema.safeParse({ ...request, userId: 'x' }).success).toBe(false);
    expect(
      learningPlanRequestSchema.safeParse({ ...request, goalDetails: 'a'.repeat(501) }).success,
    ).toBe(false);
    expect(learningPlanRequestSchema.safeParse({ ...request, dailyMinutes: 4 }).success).toBe(
      false,
    );
    expect(learningPlanRequestSchema.safeParse({ ...request, dailyMinutes: 481 }).success).toBe(
      false,
    );
    expect(learningPlanRequestSchema.safeParse({ ...request, technologyId: 'C++' }).success).toBe(
      false,
    );
  });
});

describe('learningPlanOutputSchema', () => {
  it('accepts a valid flat plan', () => {
    expect(learningPlanOutputSchema.safeParse(output).success).toBe(true);
  });

  it('bounds modules and tasks', () => {
    const module = output.modules[0]!;
    const task = output.tasks[0]!;
    expect(learningPlanOutputSchema.safeParse({ ...output, modules: [] }).success).toBe(false);
    expect(
      learningPlanOutputSchema.safeParse({
        ...output,
        modules: Array.from({ length: PLAN_MAX_MODULES + 1 }, () => module),
      }).success,
    ).toBe(false);
    expect(
      learningPlanOutputSchema.safeParse({
        ...output,
        tasks: Array.from({ length: PLAN_MAX_TASKS + 1 }, () => task),
      }).success,
    ).toBe(false);
    expect(
      learningPlanOutputSchema.safeParse({ ...output, tasks: [{ ...task, day: 29 }] }).success,
    ).toBe(false);
    expect(
      learningPlanOutputSchema.safeParse({
        ...output,
        tasks: [{ ...task, title: 'x'.repeat(161) }],
      }).success,
    ).toBe(false);
  });

  it('rejects tasks of a module that does not exist, unknown kinds and extra fields', () => {
    expect(
      learningPlanOutputSchema.safeParse({ ...output, tasks: [{ ...output.tasks[0]!, module: 3 }] })
        .success,
    ).toBe(false);
    expect(
      learningPlanOutputSchema.safeParse({
        ...output,
        tasks: [{ ...output.tasks[0]!, kind: 'party' }],
      }).success,
    ).toBe(false);
    expect(learningPlanOutputSchema.safeParse({ ...output, html: '<b>' }).success).toBe(false);
  });
});

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function detail(completed: boolean[]): LearningPlanDetail {
  return learningPlanDetailSchema.parse({
    id: uuid(1),
    user_id: uuid(99),
    technology_id: 'javascript',
    goal: 'learn_javascript',
    goal_details: null,
    experience_level: 'beginner',
    daily_minutes: 30,
    duration_days: 7,
    title: 'Plan',
    summary: 'Summary',
    review_questions: [],
    next_step: 'Next',
    status: 'active',
    prompt_version: 'learning-plan/v1',
    provider: 'mock',
    model: 'mock-mentor-1',
    created_at: '2026-10-12T10:00:00.000000+00:00',
    updated_at: '2026-10-12T10:00:00.000000+00:00',
    archived_at: null,
    learning_modules: [
      { id: uuid(20), plan_id: uuid(1), position: 2, title: 'B', description: '', objectives: [] },
      { id: uuid(10), plan_id: uuid(1), position: 1, title: 'A', description: '', objectives: [] },
    ],
    // Out of order on purpose: progress sorts by day, then position.
    learning_tasks: completed
      .map((done, index) => ({
        id: uuid(100 + index),
        plan_id: uuid(1),
        module_id: index < 2 ? uuid(10) : uuid(20),
        day_number: index + 1,
        position: index + 1,
        kind: 'learn',
        title: `Task ${index + 1}`,
        description: 'Do it.',
        estimated_minutes: 20,
        completed_at: done ? '2026-10-12T11:00:00+00:00' : null,
      }))
      .reverse(),
  });
}

describe('computePlanProgress', () => {
  it('counts every task once and points to the first open one', () => {
    const progress = computePlanProgress(detail([true, false, true]));
    expect(progress).toMatchObject({
      done: 2,
      total: 3,
      percent: 66,
      completed: false,
      currentDay: 2,
    });
    expect(progress.nextTask?.title).toBe('Task 2');
    expect(progress.modules).toEqual([
      { moduleId: uuid(10), done: 1, total: 2 },
      { moduleId: uuid(20), done: 1, total: 1 },
    ]);
  });

  it('reports a finished plan and an empty one', () => {
    expect(computePlanProgress(detail([true, true, true]))).toMatchObject({
      percent: 100,
      completed: true,
      currentDay: null,
      nextTask: null,
    });
    expect(computePlanProgress(detail([]))).toMatchObject({
      done: 0,
      total: 0,
      percent: 0,
      completed: false,
    });
  });
});

describe('selectPrimaryPlan', () => {
  const plan = (id: number, status: 'active' | 'archived', created_at: string) => ({
    id: uuid(id),
    status,
    created_at,
  });

  it('picks the oldest active plan, then the smaller id', () => {
    expect(
      selectPrimaryPlan([
        plan(3, 'active', '2026-10-12T10:00:00+00:00'),
        plan(1, 'archived', '2026-10-01T10:00:00+00:00'),
        plan(4, 'active', '2026-10-11T10:00:00+00:00'),
        plan(2, 'active', '2026-10-11T10:00:00+00:00'),
      ])?.id,
    ).toBe(uuid(2));
  });

  it('returns null without an active plan', () => {
    expect(selectPrimaryPlan([plan(1, 'archived', '2026-10-01T10:00:00+00:00')])).toBeNull();
    expect(selectPrimaryPlan([])).toBeNull();
  });
});

describe('plan limit errors', () => {
  it('carries which limit was reached', () => {
    const body = {
      error: {
        code: 'GENERATION_LIMIT_REACHED',
        message: 'm',
        requestId: 'r',
        planLimit: {
          kind: 'monthly_generations',
          used: 3,
          limit: 3,
          resetsAt: '2026-11-01T00:00:00.000Z',
        },
      },
    };
    expect(errorResponseSchema.safeParse(body).success).toBe(true);
    expect(
      errorResponseSchema.safeParse({
        error: {
          ...body.error,
          code: 'PLAN_LIMIT_REACHED',
          planLimit: { kind: 'x', used: 1, limit: 1 },
        },
      }).success,
    ).toBe(false);
  });
});
