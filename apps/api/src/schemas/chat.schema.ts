import { z } from 'zod';

import { experienceLevelSchema, primaryGoalSchema, technologySlugSchema } from './common.schema.js';

export const CHAT_MESSAGE_MAX_LENGTH = 10_000;

/**
 * Context fields are hints for the prompt only. They never affect plan,
 * limits or authorization, and each one is an enum or a simple slug so no
 * free text reaches the system prompt through them.
 */
export const chatContextSchema = z
  .object({
    technology: technologySlugSchema.optional(),
    level: experienceLevelSchema.optional(),
    learningGoal: primaryGoalSchema.optional(),
  })
  .strict();

export type ChatContext = z.infer<typeof chatContextSchema>;

export const chatRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
    conversationId: z.uuid().optional(),
    context: chatContextSchema.optional(),
  })
  .strict();

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** Usage reported with every AI answer. `quota` stays null until usage counters exist. */
export const usageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    quota: z
      .object({
        used: z.number().int().nonnegative(),
        limit: z.number().int().nonnegative(),
        period: z.literal('month'),
      })
      .strict()
      .nullable(),
  })
  .strict();

export type Usage = z.infer<typeof usageSchema>;

export const chatResponseSchema = z
  .object({
    answer: z.string().min(1),
    provider: z.literal('mock'),
    promptVersion: z.string(),
    requestId: z.string(),
    usage: usageSchema,
  })
  .strict();

export type ChatResponse = z.infer<typeof chatResponseSchema>;
