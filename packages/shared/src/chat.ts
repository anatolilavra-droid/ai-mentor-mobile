import { z } from 'zod';

import {
  AI_ANSWER_MAX_LENGTH,
  AI_PROVIDERS,
  CHAT_HISTORY_DEFAULTS,
  CHAT_HISTORY_MAX_ITEMS,
  CHAT_HISTORY_MAX_TOTAL_CHARS,
  CHAT_MESSAGE_MAX_LENGTH,
} from './constants.js';
import { experienceLevelSchema, primaryGoalSchema, technologyIdSchema } from './profile.js';
import { aiUsageSchema, type AIUsage } from './usage.js';

/**
 * Optional hints for this answer only. They never affect plan, limits or
 * access, and each one is an enum or a catalog id, so no free text reaches the
 * system prompt through them.
 */
export const chatContextSchema = z
  .object({
    technology: technologyIdSchema.optional(),
    level: experienceLevelSchema.optional(),
    learningGoal: primaryGoalSchema.optional(),
  })
  .strict();
export type ChatContext = z.infer<typeof chatContextSchema>;

/** One earlier message of the current conversation, sent by the app. */
export const chatHistoryMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(AI_ANSWER_MAX_LENGTH),
  })
  .strict();
export type ChatHistoryMessage = z.infer<typeof chatHistoryMessageSchema>;

/** POST /api/ai/chat */
export const chatRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
    history: z
      .array(chatHistoryMessageSchema)
      .max(CHAT_HISTORY_MAX_ITEMS)
      .refine(
        (items) =>
          items.reduce((sum, item) => sum + item.content.length, 0) <= CHAT_HISTORY_MAX_TOTAL_CHARS,
        `History must not exceed ${CHAT_HISTORY_MAX_TOTAL_CHARS} characters`,
      )
      .optional(),
    conversationId: z.uuid().optional(),
    context: chatContextSchema.optional(),
  })
  .strict();
export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** Token usage of this call and the monthly chat quota after it. */
export const chatUsageSchema = aiUsageSchema;
export type ChatUsage = AIUsage;

export const chatResponseSchema = z
  .object({
    answer: z.string().min(1).max(AI_ANSWER_MAX_LENGTH),
    provider: z.enum(AI_PROVIDERS),
    promptVersion: z.string().min(1),
    requestId: z.string(),
    usage: chatUsageSchema,
    /** How much of the sent history the answer used (counts only). */
    context: z
      .object({
        historyUsed: z.number().int().nonnegative(),
        historyDropped: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export type HistoryLimits = {
  /** Keep at most this many of the most recent messages. */
  maxMessages: number;
  /** Total characters of the kept messages. */
  maxChars: number;
  /** Older messages longer than this are shortened. */
  perMessageMax: number;
};

export type TrimmedHistory = {
  messages: ChatHistoryMessage[];
  kept: number;
  dropped: number;
  truncated: number;
};

const SHORTENED_MARK = '\n…[shortened]';

/**
 * Keeps the most recent messages that fit the limits, newest first:
 * long messages are shortened, older ones are dropped once the budget is
 * used, and the result never starts with an assistant message. Pure and
 * deterministic, so the app and the API trim the same way.
 */
export function trimConversationHistory(
  history: readonly ChatHistoryMessage[],
  limits: HistoryLimits = CHAT_HISTORY_DEFAULTS,
): TrimmedHistory {
  const kept: ChatHistoryMessage[] = [];
  let used = 0;
  let truncated = 0;

  for (let index = history.length - 1; index >= 0 && kept.length < limits.maxMessages; index -= 1) {
    const message = history[index];
    if (!message) continue;
    let content = message.content;
    if (content.length > limits.perMessageMax) {
      content =
        content.slice(0, Math.max(0, limits.perMessageMax - SHORTENED_MARK.length)) +
        SHORTENED_MARK;
      truncated += 1;
    }
    if (used + content.length > limits.maxChars) break;
    used += content.length;
    kept.unshift({ role: message.role, content });
  }

  // A conversation sent to a model starts with the learner, never with the mentor.
  while (kept[0]?.role === 'assistant') kept.shift();

  return { messages: kept, kept: kept.length, dropped: history.length - kept.length, truncated };
}
