import { useCallback, useEffect, useState } from 'react';

import type { AsyncState } from '@/types/async';

/**
 * Minimal loader for local async data in Phase 1 (mock data, no network).
 * Will be replaced by TanStack Query once a backend exists.
 *
 * `loader` and `isEmpty` must be stable references (module-level functions
 * or memoized), otherwise the resource reloads on every render.
 */
export function useAsyncResource<T>(
  loader: () => Promise<T>,
  isEmpty?: (data: T) => boolean,
): { state: AsyncState<T>; retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    loader()
      .then((data) => {
        if (cancelled) return;
        setState(isEmpty?.(data) ? { status: 'empty' } : { status: 'success', data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, loader, isEmpty]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
