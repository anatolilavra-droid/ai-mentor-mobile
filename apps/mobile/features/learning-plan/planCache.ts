import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  learningPlanDetailSchema,
  learningPlanSummarySchema,
  type LearningPlanDetail,
  type LearningPlanSummary,
} from '@ai-mentor/shared';
import { z } from 'zod';

/*
 * Read-only offline copy of the learner's plans: the last successfully loaded list
 * and the last opened plans. Never a write queue: changes need the network.
 *
 * - One AsyncStorage key per user; removed on sign out (clearPlanCaches).
 * - The learner's own goal words (goal_details) are never stored here.
 * - Anything that does not match the schema (an older app version, a broken write)
 *   is thrown away instead of shown.
 */

const PREFIX = 'learning-plans:v1:';
/** Plan details kept for offline reading besides the active plans. */
const MAX_EXTRA_DETAILS = 3;

const cacheSchema = z.object({
  version: z.literal(1),
  list: z.object({ savedAt: z.string(), plans: z.array(learningPlanSummarySchema) }).nullable(),
  /** Most recently saved first. */
  details: z.array(z.object({ savedAt: z.string(), plan: learningPlanDetailSchema })),
});
type PlanCache = z.infer<typeof cacheSchema>;

export type Cached<T> = { data: T; savedAt: string };

const keyFor = (userId: string) => `${PREFIX}${userId}`;
const empty = (): PlanCache => ({ version: 1, list: null, details: [] });

async function read(userId: string): Promise<PlanCache> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return empty();
    const parsed = cacheSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    await AsyncStorage.removeItem(keyFor(userId));
  } catch {
    // Unreadable storage is the same as an empty cache.
  }
  return empty();
}

async function write(userId: string, cache: PlanCache): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(cache));
  } catch {
    // The cache is a convenience: a failed write must never break the screen.
  }
}

/** Keeps the details of active plans plus the last few opened ones. */
function prune(cache: PlanCache): PlanCache {
  const active = new Set(
    (cache.list?.plans ?? []).filter((plan) => plan.status === 'active').map((plan) => plan.id),
  );
  let extra = 0;
  const details = cache.details.filter(({ plan }) => {
    if (active.has(plan.id)) return true;
    extra += 1;
    return extra <= MAX_EXTRA_DETAILS;
  });
  return { ...cache, details };
}

export async function readCachedPlans(
  userId: string,
): Promise<Cached<LearningPlanSummary[]> | null> {
  const { list } = await read(userId);
  return list ? { data: list.plans, savedAt: list.savedAt } : null;
}

export async function readCachedPlan(
  userId: string,
  planId: string,
): Promise<Cached<LearningPlanDetail> | null> {
  const entry = (await read(userId)).details.find(({ plan }) => plan.id === planId);
  return entry ? { data: entry.plan, savedAt: entry.savedAt } : null;
}

export async function cachePlans(userId: string, plans: LearningPlanSummary[]): Promise<void> {
  const cache = await read(userId);
  // Deleted plans disappear from the offline copy too.
  const ids = new Set(plans.map((plan) => plan.id));
  const details = cache.details.filter(({ plan }) => ids.has(plan.id));
  await write(
    userId,
    prune({ ...cache, list: { savedAt: new Date().toISOString(), plans }, details }),
  );
}

export async function cachePlan(userId: string, plan: LearningPlanDetail): Promise<void> {
  const cache = await read(userId);
  const entry = { savedAt: new Date().toISOString(), plan: { ...plan, goal_details: null } };
  const details = [entry, ...cache.details.filter((item) => item.plan.id !== plan.id)];
  await write(userId, prune({ ...cache, details }));
}

export async function removeCachedPlan(userId: string, planId: string): Promise<void> {
  const cache = await read(userId);
  await write(userId, {
    ...cache,
    list: cache.list
      ? { ...cache.list, plans: cache.list.plans.filter((plan) => plan.id !== planId) }
      : null,
    details: cache.details.filter(({ plan }) => plan.id !== planId),
  });
}

/** Removes every user's offline plans (sign out). */
export async function clearPlanCaches(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  } catch {
    // Nothing more can be done; the next sign-in reads only its own key anyway.
  }
}
