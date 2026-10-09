import { create } from 'zustand';

/** Local UI preferences. In-memory in Phase 1; persistence arrives with accounts. */
type PreferencesState = {
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  hapticsEnabled: true,
  setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
}));
