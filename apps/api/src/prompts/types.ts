import type { z } from 'zod';

import type { ExperienceLevel, PrimaryGoal, UiLanguage } from '@ai-mentor/shared';

import type { ChatMessage } from '../services/ai/providers/AIProvider.js';

/**
 * Learner context resolved on the server (request hints first, then the
 * profile and onboarding answers). Only enums, catalog ids and numbers: never
 * the name or free-text goal details.
 */
export type LearnerContext = {
  level: ExperienceLevel | null;
  learningGoal: PrimaryGoal | null;
  /** The technology this question is about (request hint). */
  technology: string | null;
  answerLanguage: UiLanguage;
  /** Technologies picked in onboarding (catalog ids). */
  technologies: readonly string[];
  dailyMinutes: number | null;
};

type PromptBase<TId extends string, TVersion extends `v${number}`> = {
  id: TId;
  version: TVersion;
  /** `id/version`, logged and returned to the client. */
  ref: `${TId}/${TVersion}`;
  maxOutputTokens: number;
};

/**
 * A published prompt version is immutable. Changes go into a new file (v2.ts)
 * and the registry points to it.
 */
export type TextPrompt<TId extends string, TVersion extends `v${number}`, TInput> = PromptBase<
  TId,
  TVersion
> & {
  build(input: TInput, learner: LearnerContext): { system: string; messages: ChatMessage[] };
};

export type StructuredPrompt<
  TId extends string,
  TVersion extends `v${number}`,
  TInput,
  TOutput extends z.ZodType,
> = PromptBase<TId, TVersion> & {
  build(input: TInput, learner: LearnerContext): { system: string; messages: ChatMessage[] };
  outputSchema: TOutput;
};
