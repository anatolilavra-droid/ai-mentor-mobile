import AsyncStorage from '@react-native-async-storage/async-storage';
import { computePlanProgress, learningPlanSummarySchema } from '@ai-mentor/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider';
import { PlanDataError, toPlanDataError } from '@/features/learning-plan/learningPlan.errors';
import {
  archivePlan,
  deletePlan,
  fetchPlan,
  fetchPlanLimits,
  fetchPlans,
  setTaskCompleted,
} from '@/features/learning-plan/learningPlan.service';
import {
  cachePlan,
  cachePlans,
  clearPlanCaches,
  readCachedPlan,
  readCachedPlans,
  removeCachedPlan,
} from '@/features/learning-plan/planCache';
import {
  OFFLINE_RETRY_MS,
  planKeys,
  useDeletePlan,
  useLearningPlan,
  useLearningPlans,
  usePrimaryPlan,
  useSetTaskCompleted,
} from '@/features/learning-plan/useLearningPlans';
import { createQueryClient } from '@/lib/query/queryClient';
import { supabase } from '@/lib/supabase/client';

import { planDetail, testSession, testUser } from './fixtures';

/* Every call goes to the in-memory Supabase fake; each test sets what it answers. */
type Answer = { data: unknown; error: unknown } | Error;
const fake = supabase as unknown as { from: jest.Mock; rpc: jest.Mock };

/** A PostgREST-like query that records its filters and resolves with `answer`. */
function query(answer: Answer) {
  const calls: unknown[][] = [];
  const settle = () => (answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer));
  const builder: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'order']) {
    builder[name] = (...args: unknown[]) => {
      calls.push([name, ...args]);
      return builder;
    };
  }
  builder.maybeSingle = () => settle();
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    settle().then(resolve, reject);
  return { builder, calls };
}

function answerFrom(answer: Answer) {
  const q = query(answer);
  fake.from.mockImplementationOnce(() => q.builder);
  return q;
}

const answerRpc = (answer: Answer) =>
  fake.rpc.mockImplementationOnce(() =>
    answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer),
  );

const networkError = { message: 'TypeError: Network request failed', code: '' };
const summary = () => learningPlanSummarySchema.parse(planDetail());

const clients: ReturnType<typeof createQueryClient>[] = [];

beforeEach(async () => {
  await AsyncStorage.clear();
  // Anything a test did not answer explicitly behaves like "no network".
  fake.from
    .mockReset()
    .mockImplementation(() => query({ data: null, error: networkError }).builder);
  fake.rpc
    .mockReset()
    .mockImplementation(() => Promise.resolve({ data: null, error: networkError }));
});

afterEach(() => {
  // Stops background refetches (offline retries) of the previous test.
  clients.splice(0).forEach((client) => client.clear());
});

describe('learning plan service (Supabase + RLS)', () => {
  it("reads the learner's plans with the user filter and parses them", async () => {
    const q = answerFrom({ data: [planDetail()], error: null });
    const plans = await fetchPlans(testUser.id);

    expect(fake.from).toHaveBeenCalledWith('learning_plans');
    expect(q.calls).toContainEqual(['eq', 'user_id', testUser.id]);
    expect(q.calls).toContainEqual(['order', 'created_at', { ascending: true }]);
    expect(plans[0]?.learning_tasks).toHaveLength(3);
    // The list select carries no descriptions and no goal words.
    expect(JSON.stringify(q.calls)).not.toContain('description');
    expect(plans[0]).not.toHaveProperty('goal_details');
  });

  it('reports a missing or foreign plan as NOT_FOUND', async () => {
    answerFrom({ data: null, error: null });
    await expect(fetchPlan(testUser.id, planDetail().id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('rejects data that does not match the schema', async () => {
    answerFrom({ data: [{ ...planDetail(), duration_days: 30 }], error: null });
    await expect(fetchPlans(testUser.id)).rejects.toMatchObject({ code: 'BAD_DATA' });
  });

  it('classifies Supabase failures without exposing their messages', async () => {
    answerFrom(new TypeError('Network request failed'));
    await expect(fetchPlans(testUser.id)).rejects.toMatchObject({ code: 'NETWORK' });

    answerRpc({ data: null, error: { message: 'PLAN_NOT_ACTIVE', code: 'P0001' } });
    await expect(setTaskCompleted('t', true)).rejects.toMatchObject({ code: 'PLAN_NOT_ACTIVE' });

    answerRpc({ data: null, error: { message: 'TASK_NOT_FOUND', code: 'P0001' } });
    await expect(setTaskCompleted('t', true)).rejects.toMatchObject({ code: 'NOT_FOUND' });

    expect(toPlanDataError({ message: 'JWT expired', code: 'PGRST301' }).code).toBe('UNAUTHORIZED');
    expect(toPlanDataError({ message: 'something odd' }).code).toBe('UNKNOWN');
  });

  it('calls the database functions with only ids (the user comes from the session)', async () => {
    answerRpc({
      data: [
        {
          task_id: planDetail().learning_tasks[1]!.id,
          plan_id: planDetail().id,
          completed_at: '2026-10-12T12:00:00+00:00',
          done: 2,
          total: 3,
        },
      ],
      error: null,
    });
    await expect(setTaskCompleted(planDetail().learning_tasks[1]!.id, true)).resolves.toMatchObject(
      { done: 2 },
    );
    expect(fake.rpc).toHaveBeenLastCalledWith('set_learning_task_completed', {
      p_task_id: planDetail().learning_tasks[1]!.id,
      p_completed: true,
    });

    answerRpc({
      data: [
        { plan_id: planDetail().id, status: 'archived', archived_at: '2026-10-12T12:00:00+00:00' },
      ],
      error: null,
    });
    await archivePlan(planDetail().id);
    expect(fake.rpc).toHaveBeenLastCalledWith('archive_learning_plan', {
      p_plan_id: planDetail().id,
    });

    answerRpc({ data: true, error: null });
    await deletePlan(planDetail().id);
    expect(fake.rpc).toHaveBeenLastCalledWith('delete_learning_plan', {
      p_plan_id: planDetail().id,
    });

    answerRpc({
      data: [
        {
          plan: 'free',
          active_used: 1,
          active_limit: 1,
          generations_used: 2,
          generations_limit: 3,
          period_start: '2026-10-01',
          period_end: '2026-11-01',
        },
      ],
      error: null,
    });
    await expect(fetchPlanLimits()).resolves.toEqual({
      plan: 'free',
      activeUsed: 1,
      activeLimit: 1,
      generationsUsed: 2,
      generationsLimit: 3,
      periodStart: '2026-10-01',
      periodEnd: '2026-11-01',
    });
  });
});

describe('offline plan cache', () => {
  const userId = testUser.id;

  it("keeps the list and opened plans, without the learner's goal words", async () => {
    await cachePlans(userId, [summary()]);
    await cachePlan(userId, planDetail() as never);

    expect((await readCachedPlans(userId))?.data).toHaveLength(1);
    const cached = await readCachedPlan(userId, planDetail().id);
    expect(cached?.data.title).toBe('JavaScript week');
    expect(cached?.data.goal_details).toBeNull();
    expect(JSON.stringify(await AsyncStorage.getItem(`learning-plans:v1:${userId}`))).not.toContain(
      'My private goal words',
    );
  });

  it('throws away data that does not match the schema', async () => {
    await AsyncStorage.setItem(`learning-plans:v1:${userId}`, JSON.stringify({ version: 9 }));
    expect(await readCachedPlans(userId)).toBeNull();
    expect(await AsyncStorage.getItem(`learning-plans:v1:${userId}`)).toBeNull();

    await AsyncStorage.setItem(`learning-plans:v1:${userId}`, '{not json');
    expect(await readCachedPlans(userId)).toBeNull();
  });

  it('forgets deleted plans and clears every account on sign out', async () => {
    await cachePlans(userId, [summary()]);
    await cachePlan(userId, planDetail() as never);
    await removeCachedPlan(userId, planDetail().id);
    expect((await readCachedPlans(userId))?.data).toEqual([]);
    expect(await readCachedPlan(userId, planDetail().id)).toBeNull();

    await cachePlans(userId, [summary()]);
    await cachePlans('other-user', [summary()]);
    await AsyncStorage.setItem('unrelated', 'keep');
    await clearPlanCaches();
    expect(await readCachedPlans(userId)).toBeNull();
    expect(await readCachedPlans('other-user')).toBeNull();
    expect(await AsyncStorage.getItem('unrelated')).toBe('keep');
  });
});

function wrapper() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  clients.push(client);
  const auth: AuthContextValue = {
    status: 'signedIn',
    session: testSession as never,
    user: testUser as never,
    isRecoveringPassword: false,
    setRecoveringPassword: jest.fn(),
  };
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    );
  }
  return { client, Wrapper };
}

describe('learning plan hooks', () => {
  it('loads from the network and refreshes the offline copy', async () => {
    answerFrom({ data: [planDetail()], error: null });
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useLearningPlans(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.source).toBe('network');
    expect((await readCachedPlans(testUser.id))?.data).toHaveLength(1);
  });

  it('shows the offline copy when the network is unreachable, and keeps trying', async () => {
    await cachePlans(testUser.id, [summary()]);
    answerFrom({ data: null, error: networkError });
    const { Wrapper, client } = wrapper();
    const { result } = renderHook(() => useLearningPlans(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.source).toBe('cache');
    expect(result.current.data?.data[0]?.title).toBe('JavaScript week');
    const observer = client.getQueryCache().find({ queryKey: planKeys.list(testUser.id) });
    const interval = observer?.observers[0]?.options.refetchInterval as (q: unknown) => unknown;
    expect(interval(observer)).toBe(OFFLINE_RETRY_MS);
  });

  it('reports an error without an offline copy, and never hides other failures behind it', async () => {
    answerFrom({ data: null, error: networkError });
    const first = wrapper();
    const offline = renderHook(() => useLearningPlans(), { wrapper: first.Wrapper });
    await waitFor(() => expect(offline.result.current.isError).toBe(true));
    expect(offline.result.current.error).toMatchObject({ code: 'NETWORK' });

    await cachePlans(testUser.id, [summary()]);
    answerFrom({ data: null, error: { message: 'permission denied', code: '42501' } });
    const second = wrapper();
    const denied = renderHook(() => useLearningPlans(), { wrapper: second.Wrapper });
    await waitFor(() => expect(denied.result.current.isError).toBe(true));
    expect(denied.result.current.error).toBeInstanceOf(PlanDataError);
    expect(denied.result.current.error).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('picks the oldest active plan for Home with its next task', async () => {
    const older = {
      ...planDetail(),
      id: '00000000-0000-4000-8000-0000000000c1',
      created_at: '2026-10-01T10:00:00+00:00',
      title: 'Older',
    };
    answerFrom({ data: [planDetail(), older], error: null });
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => usePrimaryPlan(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.plan).toBeDefined());
    expect(result.current.plan?.title).toBe('Older');
    expect(result.current.progress).toMatchObject({ done: 1, total: 3, currentDay: 2 });
    expect(result.current.progress?.nextTask?.title).toBe('Day 2');
  });

  it('changes a task only after the database confirmed it', async () => {
    answerFrom({ data: planDetail(), error: null });
    const { Wrapper } = wrapper();
    const planId = planDetail().id;
    const taskId = planDetail().learning_tasks[1]!.id;
    const { result } = renderHook(
      () => ({ plan: useLearningPlan(planId), complete: useSetTaskCompleted(planId) }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.plan.isSuccess).toBe(true));

    // Offline: nothing changes on screen, the error is reported.
    answerRpc({ data: null, error: networkError });
    await act(async () => {
      await result.current.complete.mutateAsync({ taskId, completed: true }).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.complete.error).toMatchObject({ code: 'NETWORK' }));
    expect(computePlanProgress(result.current.plan.data!.data).done).toBe(1);

    // Online: the confirmed time from the database is shown.
    answerRpc({
      data: [
        {
          task_id: taskId,
          plan_id: planId,
          completed_at: '2026-10-12T12:00:00+00:00',
          done: 2,
          total: 3,
        },
      ],
      error: null,
    });
    answerFrom({ data: [planDetail()], error: null });
    await act(async () => {
      await result.current.complete.mutateAsync({ taskId, completed: true });
    });
    await waitFor(() =>
      expect(
        result.current.plan.data!.data.learning_tasks.find((task) => task.id === taskId)
          ?.completed_at,
      ).toBe('2026-10-12T12:00:00+00:00'),
    );
  });

  it('drops a deleted plan from the queries and the offline copy', async () => {
    await cachePlans(testUser.id, [summary()]);
    await cachePlan(testUser.id, planDetail() as never);
    const { Wrapper, client } = wrapper();
    const { result } = renderHook(() => useDeletePlan(), { wrapper: Wrapper });

    answerRpc({ data: true, error: null });
    await act(async () => {
      await result.current.mutateAsync(planDetail().id);
    });
    expect(client.getQueryData(planKeys.detail(testUser.id, planDetail().id))).toBeUndefined();
    expect(await readCachedPlan(testUser.id, planDetail().id)).toBeNull();
  });
});
