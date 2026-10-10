import {
  CHAT_HISTORY_DEFAULTS,
  codeReviewOutputSchema,
  codeReviewRequestSchema,
} from '@ai-mentor/shared';
import pino from 'pino';
import { describe, expect, it } from 'vitest';

import { AppError } from '../src/errors/AppError.js';
import { createAIService, type AICall } from '../src/services/ai/ai.service.js';
import type { AIProvider } from '../src/services/ai/providers/AIProvider.js';
import { createMockProvider } from '../src/services/ai/providers/mock.provider.js';
import { createProfileService } from '../src/services/profile.service.js';
import { createSupabaseUsage } from '../src/services/usage/supabaseUsage.js';

import { createFakeSupabase } from './helpers/fakeSupabase.js';
import { signToken, USER_A } from './helpers/tokens.js';

async function makeCall(): Promise<AICall> {
  return {
    userId: USER_A,
    accessToken: await signToken(),
    signal: new AbortController().signal,
    log: pino({ level: 'silent' }),
  };
}

function makeService(provider: AIProvider) {
  const supabase = createFakeSupabase();
  return createAIService({
    selectProvider: () => provider,
    usageGuard: createSupabaseUsage(supabase.factory).guard,
    profileService: createProfileService(supabase.factory),
    aiTimeouts: { chat: 1_000, code_review: 1_000 },
    historyLimits: CHAT_HISTORY_DEFAULTS,
  });
}

const review = codeReviewRequestSchema.parse({
  language: 'javascript',
  action: 'explain',
  code: 'let a = 1;',
});

describe('mock provider', () => {
  it('never needs a key and answers deterministically', async () => {
    const provider = createMockProvider();
    const input = {
      system: 's',
      messages: [{ role: 'user' as const, content: 'q' }],
      maxOutputTokens: 10,
      signal: new AbortController().signal,
    };

    expect(await provider.generateText(input)).toEqual(await provider.generateText(input));
  });

  it('stops when its signal aborts', async () => {
    const controller = new AbortController();
    const pending = createMockProvider({ delayMs: 1_000 }).generateText({
      system: 's',
      messages: [],
      maxOutputTokens: 10,
      signal: controller.signal,
    });
    controller.abort(new Error('stop'));

    await expect(pending).rejects.toThrow('stop');
  });
});

describe('AIService.reviewCode', () => {
  it('returns a validated structured review from the mock provider', async () => {
    const result = await makeService(createMockProvider()).reviewCode(await makeCall(), review);

    expect(codeReviewOutputSchema.parse(result.review).summary).toContain('Mock explain of');
    expect(result.promptVersion).toBe('code-review/v3');
    expect(result.input).toEqual({
      language: 'javascript',
      action: 'explain',
      chars: 10,
      lines: 1,
    });
    expect(result.usage.quota).toEqual({ used: 1, limit: 10, period: 'month' });
  });

  it('rejects provider output that does not match the review schema', async () => {
    const provider: AIProvider = {
      ...createMockProvider(),
      reviewCode: async () => ({
        output: { summary: 'ok', issues: 'none' },
        model: 'm',
        usage: { inputTokens: 1, outputTokens: 1 },
      }),
    };

    await expect(makeService(provider).reviewCode(await makeCall(), review)).rejects.toSatisfy(
      (error) => error instanceof AppError && error.code === 'AI_INVALID_RESPONSE',
    );
  });
});
