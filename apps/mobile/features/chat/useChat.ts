import {
  CHAT_HISTORY_DEFAULTS,
  trimConversationHistory,
  type ChatHistoryMessage,
  type UsageResponse,
} from '@ai-mentor/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/features/auth/useAuth';
import { apiClient } from '@/lib/api/client';
import { apiBaseUrl } from '@/lib/api/config';

import { useChatStore, type ChatEntry } from './chat.store';

export const chatKeys = {
  usage: (userId: string) => ['usage', userId] as const,
};

let nextId = 1;
const newEntryId = () => `m${Date.now().toString(36)}${(nextId++).toString(36)}`;

/** Earlier turns for the API: successful ones only, trimmed the same way the server trims. */
export function toHistory(entries: readonly ChatEntry[]): ChatHistoryMessage[] {
  const turns = entries
    .filter((entry) => entry.role === 'assistant' || !entry.failed)
    .map((entry) => ({ role: entry.role, content: entry.content }));
  return trimConversationHistory(turns, CHAT_HISTORY_DEFAULTS).messages;
}

/** Plan and monthly usage (GET /api/usage). Disabled when the API is not configured. */
export function useUsage() {
  const { user } = useAuth();
  return useQuery({
    queryKey: chatKeys.usage(user?.id ?? 'anonymous'),
    queryFn: ({ signal }) => apiClient.usage(signal),
    enabled: Boolean(apiBaseUrl && user),
    staleTime: 30_000,
    retry: false,
  });
}

/**
 * Sends messages and keeps the in-memory conversation. A failed message stays
 * in the list, marked, so it can be retried.
 */
export function useChat() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const entries = useChatStore((state) => state.entries);
  const { addUser, addAssistant, setFailed, reset } = useChatStore.getState();

  const mutation = useMutation({
    mutationFn: async ({
      message,
      history,
    }: {
      entryId: string;
      message: string;
      history: ChatHistoryMessage[];
    }) => apiClient.chat({ message, history }),
    onSuccess: (response, { entryId }) => {
      setFailed(entryId, false);
      addAssistant(newEntryId(), response.answer, response.provider);
      if (user) {
        queryClient.setQueryData<UsageResponse>(chatKeys.usage(user.id), (current) =>
          current
            ? {
                ...current,
                features: {
                  ...current.features,
                  chat: { used: response.usage.quota.used, limit: response.usage.quota.limit },
                },
              }
            : current,
        );
      }
    },
    onError: (_error, { entryId }) => {
      setFailed(entryId, true);
      if (user) void queryClient.invalidateQueries({ queryKey: chatKeys.usage(user.id) });
    },
  });

  const send = useCallback(
    (text: string) => {
      const message = text.trim();
      if (!message || mutation.isPending) return;
      const history = toHistory(useChatStore.getState().entries);
      const entryId = newEntryId();
      addUser(entryId, message);
      mutation.mutate({ entryId, message, history });
    },
    [addUser, mutation],
  );

  /** Sends the last failed message again, with the history before it. */
  const retry = useCallback(() => {
    const all = useChatStore.getState().entries;
    let index = all.length - 1;
    while (
      index >= 0 &&
      !(all[index]?.role === 'user' && (all[index] as { failed?: boolean }).failed)
    ) {
      index -= 1;
    }
    const failed = all[index];
    if (!failed || mutation.isPending) return;
    mutation.mutate({
      entryId: failed.id,
      message: failed.content,
      history: toHistory(all.slice(0, index)),
    });
  }, [mutation]);

  const startOver = useCallback(() => {
    mutation.reset();
    reset();
  }, [mutation, reset]);

  return {
    entries,
    send,
    retry,
    startOver,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
