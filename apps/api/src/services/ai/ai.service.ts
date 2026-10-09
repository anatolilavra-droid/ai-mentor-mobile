import type { Logger } from 'pino';
import { z } from 'zod';

import { AppError } from '../../errors/AppError.js';
import { prompts } from '../../prompts/registry.js';
import type { LearnerContext } from '../../prompts/types.js';
import type { ChatContext, ChatRequest, ChatResponse } from '../../schemas/chat.schema.js';
import type { CodeReviewOutput, CodeReviewRequest } from '../../schemas/code-review.schema.js';
import type { ProfileRow } from '../../schemas/me.schema.js';
import type { ProfileService } from '../profile.service.js';
import type { Quota, UsageFeature, UsageGuard } from '../usage/UsageGuard.js';

import { toAppError } from './ai.errors.js';
import {
  codeReviewResultSchema,
  generateTextResultSchema,
  type AIProvider,
} from './providers/AIProvider.js';

/** Who is calling and how to cancel. Built by the controller from the request. */
export type AICall = {
  userId: string;
  accessToken: string;
  signal: AbortSignal;
  log: Logger;
};

type AIResultMeta = Pick<ChatResponse, 'provider' | 'promptVersion' | 'usage'>;

export type ChatResult = AIResultMeta & { answer: string };
export type CodeReviewResultData = AIResultMeta & { review: CodeReviewOutput };

export type AIService = {
  chat(call: AICall, request: ChatRequest): Promise<ChatResult>;
  reviewCode(call: AICall, request: CodeReviewRequest): Promise<CodeReviewResultData>;
};

export type AIServiceDeps = {
  /** The provider for this user (a real one only for allowed users, otherwise the mock). */
  selectProvider: (userId: string) => AIProvider;
  usageGuard: UsageGuard;
  profileService: ProfileService;
  aiTimeoutMs: number;
};

/**
 * The AI pipeline: usage check → learner context → prompt → provider (with
 * timeout) → output validation → usage record. Controllers only map HTTP.
 */
export function createAIService(deps: AIServiceDeps): AIService {
  const { selectProvider, usageGuard, profileService, aiTimeoutMs } = deps;
  const codeReviewJsonSchema = z.toJSONSchema(prompts.codeReview.outputSchema);

  async function checkUsage(call: AICall, feature: UsageFeature): Promise<Quota> {
    const decision = await usageGuard.check({ ...call, feature });
    if (!decision.allowed) {
      throw new AppError('USAGE_LIMIT_REACHED', {
        quota: {
          feature,
          used: decision.quota.used,
          limit: decision.quota.limit,
          resetsAt: decision.resetsAt,
        },
      });
    }
    return decision.quota;
  }

  /** Counts a successful call. Usage is recorded only after the AI answered. */
  async function recordUsage(
    call: AICall,
    feature: UsageFeature,
    usage: { inputTokens: number; outputTokens: number },
    quotaBefore: Quota,
  ): Promise<Quota> {
    try {
      return await usageGuard.record({ ...call, feature, ...usage });
    } catch (error) {
      // The answer is already generated; a failed record must not hide it.
      call.log.error({ err: error, feature }, 'usage record failed');
      return quotaBefore;
    }
  }

  /** The profile only personalizes the answer, so chat still works without it. */
  async function loadProfile(call: AICall): Promise<ProfileRow | null> {
    try {
      return await profileService.getOwnProfile(call);
    } catch (error) {
      if (
        !call.signal.aborted &&
        error instanceof AppError &&
        (error.code === 'PROFILE_NOT_FOUND' || error.code === 'SERVICE_UNAVAILABLE')
      ) {
        call.log.warn({ code: error.code }, 'profile unavailable, using default learner context');
        return null;
      }
      throw error;
    }
  }

  function resolveLearner(profile: ProfileRow | null, hints: ChatContext = {}): LearnerContext {
    return {
      level: hints.level ?? profile?.experience_level ?? null,
      learningGoal: hints.learningGoal ?? profile?.primary_goal ?? null,
      technology: hints.technology ?? null,
      answerLanguage: profile?.ui_language ?? 'en',
    };
  }

  /** Runs one provider call with the AI timeout and the request's abort signal. */
  async function callProvider<T>(
    call: AICall,
    provider: AIProvider,
    promptRef: string,
    run: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const timeout = AbortSignal.timeout(aiTimeoutMs);
    const signal = AbortSignal.any([call.signal, timeout]);
    const startedAt = performance.now();
    const logFields = { promptRef, provider: provider.name };
    try {
      return await run(signal);
    } catch (error) {
      const appError = toAppError(error, { request: call.signal, timeout });
      call.log.warn(
        {
          ai: { ...logFields, latencyMs: Math.round(performance.now() - startedAt) },
          code: appError.code,
        },
        'ai call failed',
      );
      throw appError;
    }
  }

  function logSuccess(
    call: AICall,
    provider: AIProvider,
    promptRef: string,
    model: string,
    usage: { inputTokens: number; outputTokens: number },
    startedAt: number,
  ) {
    call.log.info(
      {
        ai: {
          promptRef,
          provider: provider.name,
          model,
          latencyMs: Math.round(performance.now() - startedAt),
          ...usage,
        },
      },
      'ai call completed',
    );
  }

  return {
    async chat(call, request) {
      const quota = await checkUsage(call, 'chat');
      const provider = selectProvider(call.userId);
      const learner = resolveLearner(await loadProfile(call), request.context);
      const prompt = prompts.chat;
      const { system, messages } = prompt.build({ message: request.message }, learner);

      const startedAt = performance.now();
      const raw = await callProvider(call, provider, prompt.ref, (signal) =>
        provider.generateText({
          system,
          messages,
          maxOutputTokens: prompt.maxOutputTokens,
          signal,
        }),
      );
      const result = generateTextResultSchema.safeParse(raw);
      if (!result.success) throw new AppError('AI_INVALID_RESPONSE', { cause: result.error });

      logSuccess(call, provider, prompt.ref, result.data.model, result.data.usage, startedAt);
      const quotaAfter = await recordUsage(call, 'chat', result.data.usage, quota);
      return {
        answer: result.data.text,
        provider: provider.name,
        promptVersion: prompt.ref,
        usage: { ...result.data.usage, quota: quotaAfter },
      };
    },

    async reviewCode(call, request) {
      const quota = await checkUsage(call, 'code_review');
      const provider = selectProvider(call.userId);
      const learner = resolveLearner(await loadProfile(call));
      const prompt = prompts.codeReview;
      const { system, messages } = prompt.build(request, learner);

      const startedAt = performance.now();
      const raw = await callProvider(call, provider, prompt.ref, (signal) =>
        provider.reviewCode({
          system,
          messages,
          language: request.language,
          task: request.task,
          outputJsonSchema: codeReviewJsonSchema,
          maxOutputTokens: prompt.maxOutputTokens,
          signal,
        }),
      );
      const result = codeReviewResultSchema.safeParse(raw);
      if (!result.success) throw new AppError('AI_INVALID_RESPONSE', { cause: result.error });
      const review = prompt.outputSchema.safeParse(result.data.output);
      if (!review.success) throw new AppError('AI_INVALID_RESPONSE', { cause: review.error });

      logSuccess(call, provider, prompt.ref, result.data.model, result.data.usage, startedAt);
      const quotaAfter = await recordUsage(call, 'code_review', result.data.usage, quota);
      return {
        review: review.data,
        provider: provider.name,
        promptVersion: prompt.ref,
        usage: { ...result.data.usage, quota: quotaAfter },
      };
    },
  };
}
