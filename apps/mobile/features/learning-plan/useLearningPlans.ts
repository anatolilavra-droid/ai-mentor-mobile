import {
  computePlanProgress,
  selectPrimaryPlan,
  type LearningPlanDetail,
  type LearningPlanRequest,
  type LearningPlanResponse,
  type LearningPlanSummary,
} from '@ai-mentor/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useUserId } from '@/features/auth/useAuth';
import { apiClient } from '@/lib/api/client';

import { toPlanDataError } from './learningPlan.errors';
import {
  archivePlan,
  deletePlan,
  fetchPlan,
  fetchPlanLimits,
  fetchPlans,
  setTaskCompleted,
  type TaskCompletion,
} from './learningPlan.service';
import {
  cachePlan,
  cachePlans,
  readCachedPlan,
  readCachedPlans,
  removeCachedPlan,
  type Cached,
} from './planCache';

export const planKeys = {
  all: (userId: string) => ['learning-plans', userId] as const,
  list: (userId: string) => ['learning-plans', userId, 'list'] as const,
  detail: (userId: string, planId: string) => ['learning-plans', userId, 'detail', planId] as const,
  limits: (userId: string) => ['learning-plans', userId, 'limits'] as const,
};

/** Where the data on screen comes from: the network, or the offline copy (show an indicator). */
export type Loaded<T> = Cached<T> & { source: 'network' | 'cache' };

/** While only the offline copy is on screen, try the network again this often. */
export const OFFLINE_RETRY_MS = 30_000;

/**
 * Loads from Supabase and refreshes the offline copy. Only when the network is
 * unreachable does it fall back to that copy; any other failure is reported.
 */
async function networkOrCache<T>(
  load: () => Promise<T>,
  readCache: () => Promise<Cached<T> | null>,
  saveCache: (data: T) => Promise<void>,
): Promise<Loaded<T>> {
  try {
    const data = await load();
    await saveCache(data);
    return { data, savedAt: new Date().toISOString(), source: 'network' };
  } catch (error) {
    const failure = toPlanDataError(error);
    if (failure.code === 'NETWORK') {
      const cached = await readCache();
      if (cached) return { ...cached, source: 'cache' };
    }
    throw failure;
  }
}

const offlineRetry = (query: { state: { data?: { source: string } } }) =>
  query.state.data?.source === 'cache' ? OFFLINE_RETRY_MS : false;

/** The learner's plans (oldest first). Refreshes when the app returns to the foreground. */
export function useLearningPlans() {
  const userId = useUserId();
  return useQuery({
    queryKey: planKeys.list(userId),
    queryFn: () =>
      networkOrCache(
        () => fetchPlans(userId),
        () => readCachedPlans(userId),
        (plans) => cachePlans(userId, plans),
      ),
    refetchOnWindowFocus: true,
    refetchInterval: offlineRetry,
  });
}

/** One plan with modules and tasks. */
export function useLearningPlan(planId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: planKeys.detail(userId, planId),
    queryFn: () =>
      networkOrCache(
        () => fetchPlan(userId, planId),
        () => readCachedPlan(userId, planId),
        (plan) => cachePlan(userId, plan),
      ),
    refetchOnWindowFocus: true,
    refetchInterval: offlineRetry,
  });
}

/** Active plans and monthly generations, as the database counts them. Network only. */
export function useLearningPlanLimits() {
  const userId = useUserId();
  return useQuery({
    queryKey: planKeys.limits(userId),
    queryFn: async () => {
      try {
        return await fetchPlanLimits();
      } catch (error) {
        throw toPlanDataError(error);
      }
    },
    refetchOnWindowFocus: true,
  });
}

/**
 * The plan Home shows (oldest active plan, see selectPrimaryPlan) with its
 * progress and next task.
 */
export function usePrimaryPlan() {
  const plans = useLearningPlans();
  const value = useMemo(() => {
    const plan = plans.data ? selectPrimaryPlan(plans.data.data) : null;
    return plan ? { plan, progress: computePlanProgress(plan) } : null;
  }, [plans.data]);
  return { ...value, query: plans };
}

function applyCompletion<T extends LearningPlanSummary | LearningPlanDetail>(
  plan: T,
  result: TaskCompletion,
): T {
  return {
    ...plan,
    learning_tasks: plan.learning_tasks.map((task) =>
      task.id === result.task_id ? { ...task, completed_at: result.completed_at } : task,
    ),
  };
}

/** After a confirmed change: show the server's answer at once, then refresh in the background. */
function updateLoaded<T>(client: QueryClient, key: readonly unknown[], update: (data: T) => T) {
  client.setQueryData<Loaded<T>>(key, (current) =>
    current ? { ...current, data: update(current.data) } : current,
  );
}

/**
 * Ticks or unticks a task. Online only and not optimistic: the screen changes after
 * the database confirmed, and a failure leaves it as it was (show the error and Retry).
 */
export function useSetTaskCompleted(planId: string) {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      setTaskCompleted(taskId, completed),
    retry: 0,
    onSuccess: (result) => {
      updateLoaded<LearningPlanDetail>(client, planKeys.detail(userId, planId), (plan) =>
        applyCompletion(plan, result),
      );
      updateLoaded<LearningPlanSummary[]>(client, planKeys.list(userId), (plans) =>
        plans.map((plan) => (plan.id === result.plan_id ? applyCompletion(plan, result) : plan)),
      );
      const detail = client.getQueryData<Loaded<LearningPlanDetail>>(
        planKeys.detail(userId, planId),
      );
      if (detail) void cachePlan(userId, detail.data);
      void client.invalidateQueries({ queryKey: planKeys.list(userId) });
    },
  });
}

/** Archives a plan (online only). Its active slot is free afterwards. */
export function useArchivePlan() {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => archivePlan(planId),
    retry: 0,
    onSuccess: () => client.invalidateQueries({ queryKey: planKeys.all(userId) }),
  });
}

/** Deletes a plan (online only) and drops it from the offline copy. */
export function useDeletePlan() {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => deletePlan(planId),
    retry: 0,
    onSuccess: async (_result, planId) => {
      client.removeQueries({ queryKey: planKeys.detail(userId, planId) });
      await removeCachedPlan(userId, planId);
      await client.invalidateQueries({ queryKey: planKeys.list(userId) });
      await client.invalidateQueries({ queryKey: planKeys.limits(userId) });
    },
  });
}

/**
 * Generates and saves a new plan through the API. Never retried automatically
 * (every call can use a monthly generation); `cancel` or leaving the screen aborts it.
 */
export function useGenerateLearningPlan() {
  const userId = useUserId();
  const client = useQueryClient();
  const controllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: ({ request, signal }: { request: LearningPlanRequest; signal: AbortSignal }) =>
      apiClient.learningPlan(request, signal),
    retry: 0,
    onSuccess: (response: LearningPlanResponse) => {
      const loaded: Loaded<LearningPlanDetail> = {
        data: response.plan,
        savedAt: new Date().toISOString(),
        source: 'network',
      };
      client.setQueryData(planKeys.detail(userId, response.plan.id), loaded);
      client.setQueryData(planKeys.limits(userId), response.limits);
      void cachePlan(userId, response.plan);
      void client.invalidateQueries({ queryKey: planKeys.list(userId) });
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: planKeys.limits(userId) });
    },
    onSettled: () => {
      controllerRef.current = null;
    },
  });

  const generate = useCallback(
    (request: LearningPlanRequest) => {
      if (controllerRef.current) return;
      const controller = new AbortController();
      controllerRef.current = controller;
      mutation.mutate({ request, signal: controller.signal });
    },
    [mutation],
  );

  const cancel = useCallback(() => controllerRef.current?.abort(), []);
  useEffect(() => () => controllerRef.current?.abort(), []);

  return { ...mutation, generate, cancel };
}
