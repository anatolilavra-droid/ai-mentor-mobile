import type { z } from 'zod';

import type { ChatMessage } from '../services/ai/providers/AIProvider.js';
import type { ExperienceLevel, PrimaryGoal, UiLanguage } from '../schemas/common.schema.js';

/** Learner context resolved on the server (request hints first, then the profile). */
export type LearnerContext = {
  level: ExperienceLevel | null;
  learningGoal: PrimaryGoal | null;
  technology: string | null;
  answerLanguage: UiLanguage;
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
