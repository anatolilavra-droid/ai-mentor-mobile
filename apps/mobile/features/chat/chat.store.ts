import type { AIProviderName } from '@ai-mentor/shared';
import { create } from 'zustand';

export type ChatEntry =
  | { id: string; role: 'user'; content: string; failed: boolean }
  | { id: string; role: 'assistant'; content: string; provider: AIProviderName };

type ChatState = {
  entries: ChatEntry[];
  addUser: (id: string, content: string) => void;
  addAssistant: (id: string, content: string, provider: AIProviderName) => void;
  setFailed: (id: string, failed: boolean) => void;
  reset: () => void;
};

/**
 * The current conversation, kept in memory only (local UI state): it is gone
 * when the app closes. Saving conversations is a later phase.
 */
export const useChatStore = create<ChatState>((set) => ({
  entries: [],
  addUser: (id, content) =>
    set((state) => ({ entries: [...state.entries, { id, role: 'user', content, failed: false }] })),
  addAssistant: (id, content, provider) =>
    set((state) => ({ entries: [...state.entries, { id, role: 'assistant', content, provider }] })),
  setFailed: (id, failed) =>
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id === id && entry.role === 'user' ? { ...entry, failed } : entry,
      ),
    })),
  reset: () => set({ entries: [] }),
}));
