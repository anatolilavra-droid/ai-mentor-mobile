/**
 * Failures of the learning plan reads and changes that go straight to Supabase
 * (generation goes through the API and uses ApiError instead).
 * - NETWORK: no connection; show cached data where there is some, and Retry.
 * - NOT_FOUND: the plan or task is gone (deleted) or is not the learner's.
 * - PLAN_NOT_ACTIVE: tasks of an archived plan cannot be ticked.
 */
export type PlanDataErrorCode =
  'NETWORK' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'PLAN_NOT_ACTIVE' | 'BAD_DATA' | 'UNKNOWN';

export class PlanDataError extends Error {
  readonly code: PlanDataErrorCode;

  constructor(code: PlanDataErrorCode, options?: { cause?: unknown }) {
    super(code, options);
    this.name = 'PlanDataError';
    this.code = code;
  }
}

export function isPlanDataError(error: unknown): error is PlanDataError {
  return error instanceof PlanDataError;
}

type SupabaseErrorLike = { message?: unknown; code?: unknown; status?: unknown };

const NETWORK_MESSAGE =
  /network request failed|failed to fetch|fetch failed|network error|timed? ?out|aborted/i;

/** Classifies a Supabase (PostgREST) error. Messages are never shown to the learner. */
export function toPlanDataError(error: unknown): PlanDataError {
  if (isPlanDataError(error)) return error;
  const { message, code, status } = (error ?? {}) as SupabaseErrorLike;
  const text = typeof message === 'string' ? message : '';
  if (text === 'PLAN_NOT_FOUND' || text === 'TASK_NOT_FOUND') {
    return new PlanDataError('NOT_FOUND', { cause: error });
  }
  if (text === 'PLAN_NOT_ACTIVE') return new PlanDataError('PLAN_NOT_ACTIVE', { cause: error });
  if (status === 401 || code === 'PGRST301' || code === '42501' || /jwt/i.test(text)) {
    return new PlanDataError('UNAUTHORIZED', { cause: error });
  }
  if (NETWORK_MESSAGE.test(text) || error instanceof TypeError) {
    return new PlanDataError('NETWORK', { cause: error });
  }
  return new PlanDataError('UNKNOWN', { cause: error });
}

/** Failures worth a Retry button. */
export function isPlanDataRetryable(error: unknown): boolean {
  const code = isPlanDataError(error) ? error.code : 'UNKNOWN';
  return code === 'NETWORK' || code === 'UNKNOWN';
}
