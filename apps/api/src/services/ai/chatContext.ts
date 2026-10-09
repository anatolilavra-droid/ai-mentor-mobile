import {
  trimConversationHistory,
  type ChatContext,
  type ChatHistoryMessage,
  type HistoryLimits,
} from '@ai-mentor/shared';

import type { LearnerContext } from '../../prompts/types.js';
import type { ProfileRow } from '../../schemas/me.schema.js';

export { trimConversationHistory };

export type ChatContextInput = {
  /** The caller's profile, or null when it could not be read. */
  profile: ProfileRow | null;
  /** Onboarding technologies (catalog ids). */
  technologies: readonly string[];
  /** Request hints; they win over the profile for this answer only. */
  hints?: ChatContext;
  history?: readonly ChatHistoryMessage[];
  limits: HistoryLimits;
};

export type ChatContextStats = {
  kept: number;
  dropped: number;
  truncated: number;
};

export type BuiltChatContext = {
  learner: LearnerContext;
  history: ChatHistoryMessage[];
  stats: ChatContextStats;
};

/**
 * Everything the chat prompt needs, from data the server trusts:
 * - learner: profile and onboarding answers (enums, ids, numbers only; no name
 *   or free-text goal details), with request hints on top;
 * - history: only the most recent turns that fit the limits. The client trims
 *   too, but its history is never trusted as is.
 */
export function buildChatContext(input: ChatContextInput): BuiltChatContext {
  const { profile, hints = {} } = input;
  const learner: LearnerContext = {
    level: hints.level ?? profile?.experience_level ?? null,
    learningGoal: hints.learningGoal ?? profile?.primary_goal ?? null,
    technology: hints.technology ?? null,
    answerLanguage: profile?.ui_language ?? 'en',
    technologies: [...input.technologies].sort().slice(0, 8),
    dailyMinutes: profile?.daily_minutes ?? null,
  };

  const trimmed = trimConversationHistory(input.history ?? [], input.limits);
  return {
    learner,
    history: trimmed.messages,
    stats: { kept: trimmed.kept, dropped: trimmed.dropped, truncated: trimmed.truncated },
  };
}

/** Rough size of a prompt: characters, and tokens at about four characters each. For logs and limits only. */
export function estimateContextSize(parts: {
  system: string;
  messages: readonly { content: string }[];
}): { chars: number; estimatedTokens: number } {
  const chars =
    parts.system.length + parts.messages.reduce((sum, message) => sum + message.content.length, 0);
  return { chars, estimatedTokens: Math.ceil(chars / 4) };
}
