import {
  PLAN_MAX_TASKS_PER_DAY,
  type LearningPlanOutput,
  type PlanTaskKind,
} from '@ai-mentor/shared';

/** The plan as complete_learning_plan_generation() stores it. */
export type PlanDraft = {
  title: string;
  summary: string;
  nextStep: string;
  reviewQuestions: string[];
  modules: { position: number; title: string; description: string; objectives: string[] }[];
  tasks: {
    module: number;
    position: number;
    day: number;
    kind: PlanTaskKind;
    title: string;
    description: string;
    estimatedMinutes: number;
  }[];
};

/** Numbers only, for logs and the smoke test. */
export type PlanStats = {
  modules: number;
  tasks: number;
  /** Tasks dropped: after the last day, or beyond the per-day maximum. */
  droppedTasks: number;
  droppedModules: number;
  /** Days of the plan without any task. */
  emptyDays: number;
  /** Days whose tasks take more than 125 % of the daily time. */
  overBudgetDays: number;
};

/**
 * Business rules on top of the Zod schema. A schema-valid plan is made consistent
 * with the request: tasks after the last day and beyond the per-day maximum are
 * dropped, modules left without tasks are removed (and the rest renumbered), and
 * tasks are ordered by day. Returns null when no task is left: that answer is unusable.
 */
export function finalizePlan(
  output: LearningPlanOutput,
  request: { durationDays: number; dailyMinutes: number },
): { draft: PlanDraft; stats: PlanStats } | null {
  const perDay = new Map<number, number>();
  const kept = output.tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.day <= request.durationDays)
    .sort((a, b) => a.task.day - b.task.day || a.index - b.index)
    .filter(({ task }) => {
      const count = perDay.get(task.day) ?? 0;
      if (count >= PLAN_MAX_TASKS_PER_DAY) return false;
      perDay.set(task.day, count + 1);
      return true;
    })
    .map(({ task }) => task);

  if (kept.length === 0) return null;

  // Old module number → new position, for modules that still have tasks.
  const usedModules = [...new Set(kept.map((task) => task.module))].sort((a, b) => a - b);
  const renumber = new Map(usedModules.map((module, index) => [module, index + 1]));
  const modules = usedModules.map((module, index) => {
    const source = output.modules[module - 1]!;
    return {
      position: index + 1,
      title: source.title,
      description: source.description,
      objectives: source.objectives,
    };
  });

  const tasks = kept.map((task, index) => ({
    module: renumber.get(task.module)!,
    position: index + 1,
    day: task.day,
    kind: task.kind,
    title: task.title,
    description: task.description,
    estimatedMinutes: task.estimatedMinutes,
  }));

  const minutesPerDay = new Map<number, number>();
  for (const task of tasks) {
    minutesPerDay.set(task.day, (minutesPerDay.get(task.day) ?? 0) + task.estimatedMinutes);
  }
  const overBudgetDays = [...minutesPerDay.values()].filter(
    (minutes) => minutes > request.dailyMinutes * 1.25,
  ).length;

  return {
    draft: {
      title: output.title,
      summary: output.summary,
      nextStep: output.nextStep,
      reviewQuestions: output.reviewQuestions,
      modules,
      tasks,
    },
    stats: {
      modules: modules.length,
      tasks: tasks.length,
      droppedTasks: output.tasks.length - tasks.length,
      droppedModules: output.modules.length - modules.length,
      emptyDays: request.durationDays - minutesPerDay.size,
      overBudgetDays,
    },
  };
}
