import type { CodeLanguage, CodeReviewAction, CodeReviewResponse } from '@ai-mentor/shared';
import { create } from 'zustand';

type CodeReviewState = {
  language: CodeLanguage;
  action: CodeReviewAction;
  code: string;
  /** The last successful review, shown on the result screen. */
  result: CodeReviewResponse | null;
  setLanguage: (language: CodeLanguage) => void;
  setAction: (action: CodeReviewAction) => void;
  setCode: (code: string) => void;
  setResult: (result: CodeReviewResponse | null) => void;
  /** "New review": empty code and no result; language and action stay. */
  startOver: () => void;
  /** Everything back to defaults (on sign out). */
  clear: () => void;
};

const initial = {
  language: 'javascript' as CodeLanguage,
  action: 'explain' as CodeReviewAction,
  code: '',
  result: null,
};

/**
 * The code review flow's local UI state. Memory only, never persisted: pasted
 * code may contain secrets. It survives moving between the input and result
 * screens and is cleared on sign out.
 */
export const useCodeReviewStore = create<CodeReviewState>((set) => ({
  ...initial,
  setLanguage: (language) => set({ language }),
  setAction: (action) => set({ action }),
  setCode: (code) => set({ code }),
  setResult: (result) => set({ result }),
  startOver: () => set({ code: '', result: null }),
  clear: () => set(initial),
}));
