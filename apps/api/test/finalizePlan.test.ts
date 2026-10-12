import type { LearningPlanOutput } from '@ai-mentor/shared';
import { describe, expect, it } from 'vitest';

import { finalizePlan } from '../src/services/learningPlan/finalizePlan.js';

const task = (module: number, day: number, minutes = 20) => ({
  module,
  day,
  kind: 'learn' as const,
  title: `M${module} D${day}`,
  description: 'Do it.',
  estimatedMinutes: minutes,
});

const base: LearningPlanOutput = {
  title: 't',
  summary: 's',
  modules: [
    { title: 'A', description: 'a', objectives: [] },
    { title: 'B', description: 'b', objectives: [] },
    { title: 'C', description: 'c', objectives: ['x'] },
  ],
  tasks: [task(3, 2), task(1, 1), task(3, 3)],
  reviewQuestions: [],
  nextStep: 'n',
  confidence: 'high',
};

describe('finalizePlan', () => {
  it('orders tasks by day, numbers positions and drops modules without tasks', () => {
    const result = finalizePlan(base, { durationDays: 7, dailyMinutes: 30 })!;
    expect(result.draft.tasks.map((t) => [t.day, t.position, t.module])).toEqual([
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 2],
    ]);
    expect(result.draft.modules.map((m) => [m.position, m.title])).toEqual([
      [1, 'A'],
      [2, 'C'],
    ]);
    expect(result.stats).toEqual({
      modules: 2,
      tasks: 3,
      droppedTasks: 0,
      droppedModules: 1,
      emptyDays: 4,
      overBudgetDays: 0,
    });
  });

  it('drops tasks after the last day and beyond 3 a day, and counts over-budget days', () => {
    const result = finalizePlan(
      { ...base, tasks: [task(1, 1, 40), task(1, 1), task(1, 1), task(1, 1), task(1, 8)] },
      { durationDays: 7, dailyMinutes: 30 },
    )!;
    expect(result.draft.tasks).toHaveLength(3);
    expect(result.stats).toMatchObject({ droppedTasks: 2, overBudgetDays: 1, emptyDays: 6 });
  });

  it('returns null when no task is left', () => {
    expect(
      finalizePlan({ ...base, tasks: [task(1, 10)] }, { durationDays: 7, dailyMinutes: 30 }),
    ).toBeNull();
  });
});
