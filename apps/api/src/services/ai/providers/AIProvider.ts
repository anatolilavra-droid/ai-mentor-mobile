import type { AIProviderName, CodeLanguage, CodeReviewAction } from '@ai-mentor/shared';
import { z } from 'zod';

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
  action: CodeReviewAction;
  /** JSON Schema of the expected output, for providers that can constrain their answer. */
  outputJsonSchema: unknown;
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

/** Structured (JSON) answers of features other than code review. */
export type StructuredTask = 'learning_plan';

export type GenerateStructuredInput = {
  task: StructuredTask;
  system: string;
  /** User text is wrapped by the prompt as delimited data. */
  messages: ChatMessage[];
  /** JSON Schema of the expected output, for providers that can constrain their answer. */
  outputJsonSchema: unknown;
  maxOutputTokens: number;
  /** Largest raw answer (characters) accepted before it is parsed. */
  maxResponseChars: number;
  signal: AbortSignal;
  /**
   * Enums and numbers only, for the mock's deterministic answer. Real providers
   * ignore them (everything they need is in the prompt).
   */
  hints: { technologyId: string; durationDays: number; dailyMinutes: number };
};

/** `output` is unchecked JSON; the feature service validates it with Zod. */
export const structuredResultSchema = z.object({
  output: z.unknown(),
  model: z.string().min(1),
  usage: tokenUsageSchema,
  /** Size of the raw answer, for logs and the smoke test. */
  responseChars: z.number().int().nonnegative(),
});
export type StructuredResult = z.infer<typeof structuredResultSchema>;

export type { AIProviderName };

export interface AIProvider {
  readonly name: AIProviderName;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  reviewCode(input: CodeReviewInput): Promise<CodeReviewResult>;
  generateStructured(input: GenerateStructuredInput): Promise<StructuredResult>;
}

/**
 * - rate_limited: the provider refused because of its request quota (HTTP 429).
 * - overloaded: the provider is temporarily over capacity (e.g. Gemini 503 UNAVAILABLE).
 * Both are temporary: the API reports AI_PROVIDER_BUSY and never retries by itself.
 */
export type AIProviderErrorKind =
  | 'timeout'
  | 'rate_limited'
  | 'overloaded'
  | 'unavailable'
  | 'invalid_response'
  | 'refused'
  | 'unknown';

/** Providers translate their own failures into this error. */
export class AIProviderError extends Error {
  readonly kind: AIProviderErrorKind;

  constructor(kind: AIProviderErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AIProviderError';
    this.kind = kind;
  }
}
