import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { draftSchema, type OnboardingDraft } from '@/features/onboarding/onboarding.schemas';
import type { OnboardingMode } from '@/features/onboarding/steps';

/**
 * Onboarding answers saved on the device after every step, so closing the app
 * never loses them. One draft per user and mode. A draft is never treated as a
 * saved profile: it is cleared only after Supabase confirms the save.
 */
type DraftState = {
  drafts: Record<string, OnboardingDraft>;
  saveDraft: (draft: Omit<OnboardingDraft, 'version' | 'updatedAt'>) => void;
  clearDraft: (userId: string, mode: OnboardingMode) => void;
  clearAll: () => void;
};

export function draftKey(userId: string, mode: OnboardingMode): string {
  return `${userId}:${mode}`;
}

export const useOnboardingDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      saveDraft: (draft) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [draftKey(draft.userId, draft.mode)]: {
              ...draft,
              version: 1,
              updatedAt: new Date().toISOString(),
            },
          },
        })),
      clearDraft: (userId, mode) =>
        set((state) => {
          const drafts = { ...state.drafts };
          delete drafts[draftKey(userId, mode)];
          return { drafts };
        }),
      clearAll: () => set({ drafts: {} }),
    }),
    {
      name: 'onboarding-drafts',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ drafts: state.drafts }),
    },
  ),
);

/** Returns the draft only if it is still valid for this user and mode. */
export function readDraft(userId: string, mode: OnboardingMode): OnboardingDraft | null {
  const raw = useOnboardingDraftStore.getState().drafts[draftKey(userId, mode)];
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success || parsed.data.userId !== userId || parsed.data.mode !== mode) return null;
  return parsed.data;
}

/** True once saved drafts have been read from the device. */
export function useDraftsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useOnboardingDraftStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    const unsubscribe = useOnboardingDraftStore.persist.onFinishHydration(() => setHydrated(true));
    if (useOnboardingDraftStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, [hydrated]);
  return hydrated;
}
