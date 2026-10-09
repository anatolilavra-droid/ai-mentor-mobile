import { z } from 'zod';

import type { CodeLanguage, CodeReviewTask } from '../../../schemas/code-review.schema.js';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type GenerateTextInput = {
  system: string;
  messages: ChatMessage[];
  maxOutputTokens: number;
  /** Aborted on timeout or client disconnect. Providers must stop work when it fires. */
  signal: AbortSignal;
};

export type CodeReviewInput = {
  system: string;
  /** The user's code, wrapped by the prompt. It is data only and never executed. */
  messages: ChatMessage[];
  language: CodeLanguage;
  task: CodeReviewTask;
  maxOutputTokens: number;
  signal: AbortSignal;
};

/**
 * What a provider must return. Results are validated with Zod by AIService,
 * because a provider is an external system.
 */
export const tokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});

export const generateTextResultSchema = z.object({
  text: z.string().trim().min(1).max(40_000),
  model: z.string().min(1),
  usage: tokenUsageSchema,
  finishReason: z.enum(['stop', 'length', 'refusal', 'other']),
});
export type GenerateTextResult = z.infer<typeof generateTextResultSchema>;

/** `output` is unchecked JSON; AIService validates it against the prompt's output schema. */
export const codeReviewResultSchema = z.object({
  output: z.unknown(),
  model: z.string().min(1),
  usage: tokenUsageSchema,
});
export type CodeReviewResult = z.infer<typeof codeReviewResultSchema>;

export type AIProviderName = 'mock';

export interface AIProvider {
  readonly name: AIProviderName;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  reviewCode(input: CodeReviewInput): Promise<CodeReviewResult>;
}

export type AIProviderErrorKind =
  'timeout' | 'rate_limited' | 'unavailable' | 'invalid_response' | 'refused' | 'unknown';

/** Providers translate their own failures into this error. */
export class AIProviderError extends Error {
  readonly kind: AIProviderErrorKind;

  constructor(kind: AIProviderErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AIProviderError';
    this.kind = kind;
  }
}
