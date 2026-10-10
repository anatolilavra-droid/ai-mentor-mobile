import type { CodeReviewRequest, CodeReviewResponse, UsageResponse } from '@ai-mentor/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { useAuth } from '@/features/auth/useAuth';
import { chatKeys } from '@/features/chat/useChat';
import { apiClient } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';

import { useCodeReviewStore } from './codeReview.store';

type Variables = { request: CodeReviewRequest; signal: AbortSignal };

/**
 * Sends one code review. Never retried automatically (every call can use the
 * AI quota): `retry` only runs when the user asks. `cancel`, or leaving the
 * screen, aborts the request; the server then stops the AI call too.
 */
export function useCodeReview({
  onSuccess,
}: {
  onSuccess: (response: CodeReviewResponse) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const controllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<CodeReviewRequest | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const mutation = useMutation({
    mutationFn: ({ request, signal }: Variables) => apiClient.codeReview(request, signal),
    retry: 0,
    onSuccess: (response) => {
      useCodeReviewStore.getState().setResult(response);
      if (user) {
        queryClient.setQueryData<UsageResponse>(chatKeys.usage(user.id), (current) =>
          current
            ? {
                ...current,
                features: {
                  ...current.features,
                  code_review: {
                    used: response.usage.quota.used,
                    limit: response.usage.quota.limit,
                  },
                },
              }
            : current,
        );
      }
      onSuccessRef.current(response);
    },
    onError: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: chatKeys.usage(user.id) });
    },
    onSettled: () => {
      controllerRef.current = null;
    },
  });

  const run = useCallback(
    (request: CodeReviewRequest) => {
      if (controllerRef.current) return;
      const controller = new AbortController();
      controllerRef.current = controller;
      mutation.mutate({ request, signal: controller.signal });
    },
    [mutation],
  );

  const submit = useCallback(
    (request: CodeReviewRequest) => {
      lastRequestRef.current = request;
      run(request);
    },
    [run],
  );

  /** Sends the last request again, only after the user pressed Retry. */
  const retry = useCallback(() => {
    if (lastRequestRef.current) run(lastRequestRef.current);
  }, [run]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    mutation.reset();
  }, [mutation]);

  // Leaving the screen stops a running review.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const error = mutation.error;
  const visibleError = isApiError(error) && error.code === 'CANCELLED' ? null : error;

  return {
    submit,
    retry,
    cancel,
    reset: mutation.reset,
    isPending: mutation.isPending,
    error: visibleError,
  };
}
