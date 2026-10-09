import type { ReactNode } from 'react';

import type { AsyncState } from '@/types/async';

import { ErrorState } from './ErrorState';

type AsyncViewProps<T> = {
  state: AsyncState<T>;
  loading: ReactNode;
  /** Shown when the resource resolved with no data. */
  empty?: ReactNode;
  children: (data: T) => ReactNode;
  onRetry?: () => void;
  /** Override the default error view. */
  error?: (error: Error) => ReactNode;
  testID?: string;
};

/** Renders exactly one view per async status, so no screen forgets a state. */
export function AsyncView<T>({
  state,
  loading,
  empty = null,
  children,
  onRetry,
  error,
  testID,
}: AsyncViewProps<T>) {
  switch (state.status) {
    case 'loading':
      return <>{loading}</>;
    case 'empty':
      return <>{empty}</>;
    case 'error':
      return (
        <>
          {error ? (
            error(state.error)
          ) : (
            <ErrorState onRetry={onRetry} testID={testID ? `${testID}-error` : undefined} />
          )}
        </>
      );
    case 'success':
      return <>{children(state.data)}</>;
  }
}
