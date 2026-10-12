import type { Logger } from 'pino';
import { z } from 'zod';

import { AppError } from '../../errors/AppError.js';
import { prompts } from '../../prompts/registry.js';
import {
  PLAN_RESPONSE_MAX_CHARS,
  countCodeLines,
  type ChatRequest,
  type ChatResponse,
  type CodeReviewResponse,
  type HistoryLimits,
  type LearningPlanResponse,
  type ParsedCodeReviewRequest,
  type ParsedLearningPlanRequest,
} from '@ai-mentor/shared';
import type { LearnerContext } from '../../prompts/types.js';
import type { ProfileRow } from '../../schemas/me.schema.js';
import type { ProfileService } from '../profile.service.js';
import { finalizePlan } from '../learningPlan/finalizePlan.js';
import type { LearningPlanStore } from '../learningPlan/learningPlanStore.js';
import type { Quota, UsageFeature, UsageGuard } from '../usage/UsageGuard.js';

import { toAppError } from './ai.errors.js';
import { buildChatContext, estimateContextSize } from './chatContext.js';
import { finalizeReview, isFixedCodeCollapsed } from './finalizeReview.js';
import {
  codeReviewResultSchema,
  generateTextResultSchema,
  structuredResultSchema,
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

export type ChatResult = AIResultMeta & Pick<ChatResponse, 'answer' | 'context'>;
export type CodeReviewResultData = AIResultMeta & Pick<CodeReviewResponse, 'review' | 'input'>;
export type LearningPlanResultData = Omit<LearningPlanResponse, 'requestId'>;

/** Features with their own AI timeout. */
export type AIFeature = UsageFeature | 'learning_plan';

export type AIService = {
  chat(call: AICall, request: ChatRequest): Promise<ChatResult>;
  /** The request must already be parsed by codeReviewRequestSchema (normalized code). */
  reviewCode(call: AICall, request: ParsedCodeReviewRequest): Promise<CodeReviewResultData>;
  /**
   * Reserves a slot (limits), asks the AI, validates and saves the plan. The plan
   * is saved and counted together, or not at all.
   */
  generateLearningPlan(
    call: AICall,
    request: ParsedLearningPlanRequest,
  ): Promise<LearningPlanResultData>;
};

export type AIServiceDeps = {
  /** The provider for this user (a real one only for allowed users, otherwise the mock). */
  selectProvider: (userId: string) => AIProvider;
  usageGuard: UsageGuard;
  profileService: ProfileService;
  /** How long one AI call of each feature may take before it is aborted. */
  aiTimeouts: Record<AIFeature, number>;
  /** How much conversation history a chat prompt may carry. */
  historyLimits: HistoryLimits;
  /** Learning plan limits and storage (database functions, as the user). */
  learningPlanStore: LearningPlanStore;
};

/**
 * The AI pipeline: usage check → learner context → prompt → provider (with
 * timeout) → output validation → usage record. Controllers only map HTTP.
 */
export function createAIService(deps: AIServiceDeps): AIService {
  const { selectProvider, usageGuard, profileService, aiTimeouts, historyLimits } = deps;
  const { learningPlanStore } = deps;
  const codeReviewJsonSchema = z.toJSONSchema(prompts.codeReview.outputSchema);
  const learningPlanJsonSchema = z.toJSONSchema(prompts.learningPlan.outputSchema);

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

  /**
   * Profile and onboarding technologies only personalize the answer, so the
   * AI still answers (with defaults) when they cannot be read.
   */
  async function optional<T>(
    call: AICall,
    what: string,
    load: () => Promise<T>,
    fallback: T,
  ): Promise<T> {
    try {
      return await load();
    } catch (error) {
      if (
        !call.signal.aborted &&
        error instanceof AppError &&
        (error.code === 'PROFILE_NOT_FOUND' || error.code === 'SERVICE_UNAVAILABLE')
      ) {
        call.log.warn({ code: error.code }, `${what} unavailable, using defaults`);
        return fallback;
      }
      throw error;
    }
  }

  /** Earlier progress with the technology; personalization only, so failures are ignored. */
  async function optionalProgress(call: AICall, technologyId: string) {
    try {
      return await learningPlanStore.progressSummary(call, technologyId);
    } catch (error) {
      if (call.signal.aborted) throw error;
      call.log.warn(
        { code: error instanceof AppError ? error.code : 'UNKNOWN' },
        'progress unavailable',
      );
      return { previousPlans: 0, completedTasks: 0, completedModules: [] };
    }
  }

  async function loadLearnerData(call: AICall) {
    const [profile, technologies] = await Promise.all([
      optional<ProfileRow | null>(call, 'profile', () => profileService.getOwnProfile(call), null),
      optional<string[]>(call, 'technologies', () => profileService.getOwnTechnologies(call), []),
    ]);
    return { profile, technologies };
  }

  /** Learner context for prompts without history (code review). */
  async function loadLearner(call: AICall): Promise<LearnerContext> {
    const { profile, technologies } = await loadLearnerData(call);
    return buildChatContext({ profile, technologies, limits: historyLimits }).learner;
  }

  /**
   * Runs one provider call with the feature's AI timeout and the request's abort
   * signal: whichever fires first aborts the provider request.
   */
  async function callProvider<T>(
    call: AICall,
    feature: AIFeature,
    provider: AIProvider,
    promptRef: string,
    run: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const timeout = AbortSignal.timeout(aiTimeouts[feature]);
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
      const { profile, technologies } = await loadLearnerData(call);
      const context = buildChatContext({
        profile,
        technologies,
        hints: request.context,
        history: request.history,
        limits: historyLimits,
      });
      const prompt = prompts.chat;
      const { system, messages } = prompt.build(
        { message: request.message, history: context.history },
        context.learner,
      );
      const size = estimateContextSize({ system, messages });
      call.log.info(
        { chatContext: { ...context.stats, estimatedTokens: size.estimatedTokens } },
        'chat context built',
      );

      const startedAt = performance.now();
      const raw = await callProvider(call, 'chat', provider, prompt.ref, (signal) =>
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
        context: { historyUsed: context.stats.kept, historyDropped: context.stats.dropped },
      };
    },

    async reviewCode(call, request) {
      const input = {
        language: request.language,
        action: request.action,
        chars: request.code.length,
        lines: countCodeLines(request.code),
      };
      // Sizes only: the code itself is never logged.
      call.log.info({ codeReview: input }, 'code review requested');

      const quota = await checkUsage(call, 'code_review');
      const provider = selectProvider(call.userId);
      const learner = await loadLearner(call);
      const prompt = prompts.codeReview;
      const { system, messages } = prompt.build(request, learner);

      const startedAt = performance.now();
      const raw = await callProvider(call, 'code_review', provider, prompt.ref, (signal) =>
        provider.reviewCode({
          system,
          messages,
          language: request.language,
          action: request.action,
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
      const finalReview = finalizeReview(review.data, input);
      if (isFixedCodeCollapsed(finalReview, input.lines)) {
        // Line counts only: the code itself is never logged.
        call.log.warn(
          { codeReview: { promptRef: prompt.ref, action: input.action, lines: input.lines } },
          'fixed code returned on one line',
        );
      }
      const quotaAfter = await recordUsage(call, 'code_review', result.data.usage, quota);
      return {
        review: finalReview,
        input,
        provider: provider.name,
        promptVersion: prompt.ref,
        usage: { ...result.data.usage, quota: quotaAfter },
      };
    },

    async generateLearningPlan(call, request) {
      // Enums, numbers and lengths only: never the goal details or the plan text.
      call.log.info(
        {
          learningPlan: {
            technologyId: request.technologyId,
            goal: request.goal,
            durationDays: request.durationDays,
            dailyMinutes: request.dailyMinutes,
            goalDetailsChars: request.goalDetails?.length ?? 0,
          },
        },
        'learning plan requested',
      );

      const provider = selectProvider(call.userId);
      const { profile, technologies } = await loadLearnerData(call);
      const learner = buildChatContext({ profile, technologies, limits: historyLimits }).learner;
      const progress = await optionalProgress(call, request.technologyId);

      // Limits are checked and a slot reserved before any AI call.
      const { generationId, limits } = await learningPlanStore.begin(call, request);
      call.log.info({ learningPlan: { generationId, limits } }, 'learning plan slot reserved');

      const prompt = prompts.learningPlan;
      const startedAt = performance.now();
      let planId: string;
      let usage: { inputTokens: number; outputTokens: number };
      let model: string;
      try {
        const { system, messages } = prompt.build(
          {
            technologyId: request.technologyId,
            goal: request.goal,
            goalDetails: request.goalDetails,
            durationDays: request.durationDays,
            dailyMinutes: request.dailyMinutes,
            progress,
          },
          learner,
        );
        const raw = await callProvider(call, 'learning_plan', provider, prompt.ref, (signal) =>
          provider.generateStructured({
            task: 'learning_plan',
            system,
            messages,
            outputJsonSchema: learningPlanJsonSchema,
            maxOutputTokens: prompt.maxOutputTokens,
            maxResponseChars: PLAN_RESPONSE_MAX_CHARS,
            signal,
            hints: {
              technologyId: request.technologyId,
              durationDays: request.durationDays,
              dailyMinutes: request.dailyMinutes,
            },
          }),
        );
        const result = structuredResultSchema.safeParse(raw);
        if (!result.success) throw new AppError('AI_INVALID_RESPONSE', { cause: result.error });
        const output = prompt.outputSchema.safeParse(result.data.output);
        if (!output.success) throw new AppError('AI_INVALID_RESPONSE', { cause: output.error });
        const finalized = finalizePlan(output.data, request);
        if (!finalized) throw new AppError('AI_INVALID_RESPONSE');

        const latencyMs = Math.round(performance.now() - startedAt);
        call.log.info(
          { learningPlan: { ...finalized.stats, responseChars: result.data.responseChars } },
          'learning plan validated',
        );
        if (finalized.stats.overBudgetDays > 0 || finalized.stats.emptyDays > 0) {
          call.log.warn({ learningPlan: finalized.stats }, 'learning plan does not fit the days');
        }

        model = result.data.model;
        usage = result.data.usage;
        planId = await learningPlanStore.complete(call, {
          generationId,
          experienceLevel: learner.level ?? 'beginner',
          goalDetails: request.goalDetails,
          draft: finalized.draft,
          meta: {
            provider: provider.name,
            model,
            promptVersion: prompt.ref,
            ...usage,
            latencyMs,
          },
        });
      } catch (error) {
        // Not saved: release the reservation so the slot and the generation are free again.
        const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
        const released = await learningPlanStore.release(call.accessToken, generationId, code);
        call.log.warn(
          { learningPlan: { generationId, released }, code },
          'learning plan not saved',
        );
        throw error;
      }

      logSuccess(call, provider, prompt.ref, model, usage, startedAt);
      // Saved and counted. Reading it back is a plain RLS select.
      const plan = await learningPlanStore.fetchPlan(call, planId);
      return { plan, limits, provider: provider.name, promptVersion: prompt.ref, usage };
    },
  };
}
