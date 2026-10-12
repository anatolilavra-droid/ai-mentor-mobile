/**
 * Manual smoke test of the real AI provider (GitHub Actions "AI smoke test").
 *
 * - Without AI_MODEL: lists the Gemini models this key can use, so the exact
 *   model id can be copied instead of guessed.
 * - With AI_MODEL: sends one fixed learning question and a small fixed code
 *   sample for every code review action through the real adapter and prompts,
 *   and validates every answer.
 * - Learning plans (SMOKE_SUITE all or learning_plan): one fixed request for 7, 14
 *   and 28 days. Measures request and response size, latency, tokens, modules and
 *   tasks, checks JSON, Zod and the business rules (finalizePlan), and checks that a
 *   too-short timeout aborts the call. With PLAN_OUTPUT_DIR set, each validated plan
 *   is written there so the workflow can save it in a Postgres with the real
 *   migrations (complete_learning_plan_generation).
 *
 * Only fixed sample content is sent: no user data. The key is read from the
 * environment and never printed.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CODE_REVIEW_ACTIONS,
  PLAN_DURATION_DAYS,
  PLAN_RESPONSE_MAX_CHARS,
  codeReviewRequestSchema,
  countCodeLines,
  type PlanDurationDays,
} from '@ai-mentor/shared';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

import { prompts } from '../src/prompts/registry.js';
import type { LearnerContext } from '../src/prompts/types.js';
import { finalizeReview, isFixedCodeCollapsed } from '../src/services/ai/finalizeReview.js';
import { finalizePlan } from '../src/services/learningPlan/finalizePlan.js';
import { generateTextResultSchema } from '../src/services/ai/providers/AIProvider.js';
import { createGeminiProvider } from '../src/services/ai/providers/gemini.provider.js';
import { createMockProvider } from '../src/services/ai/providers/mock.provider.js';

const TIMEOUT_MS = 60_000;
/** Same as LEARNING_PLAN_AI_TIMEOUT_MS on the server. */
const PLAN_TIMEOUT_MS = 90_000;
/** The deliberately too-short timeout of the timeout check. */
const PLAN_SHORT_TIMEOUT_MS = 1_500;

const env = z
  .object({
    /** Not needed for AI_MODEL=mock (a local dry run of this script). */
    GEMINI_API_KEY: z.string().min(20).optional(),
    AI_MODEL: z
      .string()
      .regex(/^[a-z0-9][a-z0-9.-]{2,63}$/)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    /** all | chat_code_review | learning_plan: fewer calls when the free tier is tight. */
    SMOKE_SUITE: z.enum(['all', 'chat_code_review', 'learning_plan']).default('all'),
    /** Optional USD prices per million tokens, for a cost estimate. Never guessed. */
    PRICE_INPUT_PER_M: z.coerce
      .number()
      .nonnegative()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    PRICE_OUTPUT_PER_M: z.coerce
      .number()
      .nonnegative()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    /** Where validated plans are written for the database step (fixed sample content only). */
    PLAN_OUTPUT_DIR: z
      .string()
      .min(1)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    /** Pause between plan calls, so the free tier's per-minute limit is not hit. */
    PLAN_PAUSE_MS: z.coerce.number().int().min(0).max(120_000).default(15_000),
  })
  .safeParse(process.env);

const lines: string[] = [];
const out = (line = '') => {
  lines.push(line);
  process.stdout.write(`${line}\n`);
};
function finish(code: number): never {
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, `${lines.join('\n')}\n`);
  process.exit(code);
}

if (!env.success) {
  out('## AI smoke test: configuration problem');
  for (const issue of env.error.issues) out(`- ${String(issue.path[0])}: missing or invalid`);
  out('Add the GEMINI_API_KEY secret (Settings → Secrets and variables → Actions → Secrets).');
  finish(1);
}
const { GEMINI_API_KEY: apiKey, AI_MODEL: model, SMOKE_SUITE: suite } = env.data;

/** Error description without any request content or key. */
function describe(error: unknown): string {
  if (error instanceof Error) {
    const kind = 'kind' in error ? ` (${String(error.kind)})` : '';
    const status = 'status' in error ? ` HTTP ${String(error.status)}` : '';
    const cause = error.cause instanceof Error ? ` — ${error.cause.message.slice(0, 300)}` : '';
    return `${error.name}${kind}${status}: ${error.message.slice(0, 200)}${cause}`;
  }
  return 'unknown error';
}

if (!model) {
  if (!apiKey) {
    out('## AI smoke test: configuration problem');
    out('- GEMINI_API_KEY: missing or invalid');
    finish(1);
  }
  out('## Gemini models available to this key');
  out('Copy one id into the workflow input `model` (a Flash model is the cheapest).');
  out();
  try {
    const pager = await new GoogleGenAI({ apiKey }).models.list();
    for await (const entry of pager) {
      if (!entry.supportedActions?.includes('generateContent')) continue;
      const id = (entry.name ?? '').replace(/^models\//, '');
      out(`- \`${id}\`${entry.displayName ? ` — ${entry.displayName}` : ''}`);
    }
  } catch (error) {
    out(`Listing failed: ${describe(error)}`);
    finish(1);
  }
  finish(0);
}

// AI_MODEL=mock runs the same checks on the deterministic mock (no key, no network).
if (model !== 'mock' && !apiKey) {
  out('## AI smoke test: configuration problem');
  out('- GEMINI_API_KEY: missing or invalid');
  finish(1);
}
const provider =
  model === 'mock' ? createMockProvider() : createGeminiProvider({ apiKey: apiKey ?? '', model });
const learner: LearnerContext = {
  level: 'beginner',
  learningGoal: 'learn_javascript',
  technology: 'javascript',
  answerLanguage: 'en',
  technologies: ['javascript'],
  dailyMinutes: 30,
};
let failed = false;

out(`## AI smoke test: \`${model}\``);
out();

if (suite !== 'learning_plan') {
  /* 1. A fixed learning question through the current chat prompt. */
  try {
    const prompt = prompts.chat;
    const built = prompt.build(
      { message: 'What is the difference between let and const?', history: [] },
      learner,
    );
    const startedAt = performance.now();
    const raw = await provider.generateText({
      ...built,
      maxOutputTokens: prompt.maxOutputTokens,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const result = generateTextResultSchema.parse(raw);
    out(`### Chat (${prompt.ref}) ✅`);
    out(
      `Model \`${result.model}\`, ${Math.round(performance.now() - startedAt)} ms, ` +
        `${result.usage.inputTokens} input / ${result.usage.outputTokens} output tokens, finish: ${result.finishReason}`,
    );
    out();
    out(
      result.text
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n'),
    );
    out();
  } catch (error) {
    failed = true;
    out(`### Chat ❌`);
    out(describe(error));
  }

  /* 2. Every code review action on one small fixed sample, with JSON output. */
  const SAMPLE_CODE = [
    'function average(numbers) {',
    '  let total = 0;',
    '  for (let i = 0; i <= numbers.length; i++) {',
    '    total += numbers[i];',
    '  }',
    '  return total / numbers.length;',
    '}',
  ].join('\n');

  for (const action of CODE_REVIEW_ACTIONS) {
    try {
      const request = codeReviewRequestSchema.parse({
        language: 'javascript',
        action,
        code: SAMPLE_CODE,
      });
      const prompt = prompts.codeReview;
      const built = prompt.build(request, learner);
      const startedAt = performance.now();
      const raw = await provider.reviewCode({
        ...built,
        language: request.language,
        action: request.action,
        outputJsonSchema: z.toJSONSchema(prompt.outputSchema),
        maxOutputTokens: prompt.maxOutputTokens,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const review = finalizeReview(prompt.outputSchema.parse(raw.output), {
        action,
        lines: countCodeLines(request.code),
      });
      // The sample has several lines, so fixed code must keep its line breaks.
      const collapsed = isFixedCodeCollapsed(review, countCodeLines(request.code));
      if (collapsed) failed = true;
      const fixedLines = review.fixedCode ? countCodeLines(review.fixedCode.trim()) : 0;
      out(`### Code review: ${action} (${prompt.ref}) ${collapsed ? '❌' : '✅'}`);
      out(
        `${Math.round(performance.now() - startedAt)} ms, ` +
          `${raw.usage.inputTokens} input / ${raw.usage.outputTokens} output tokens, ` +
          `${review.issues.length} issue(s), steps: ${review.steps?.length ?? 0}, ` +
          `fixed code: ${review.fixedCode ? `${fixedLines} line(s)` : 'no'}, ` +
          `confidence: ${review.confidence}; the answer matches the review schema.`,
      );
      if (collapsed) out('Fixed code came back on one line: it must keep the line breaks.');
      out();
      out('<details><summary>Answer</summary>');
      out();
      out('```json');
      out(JSON.stringify(review, null, 2));
      out('```');
      out('</details>');
      out();
    } catch (error) {
      failed = true;
      out(`### Code review: ${action} ❌`);
      out(describe(error));
    }
  }
}

/* 3. Learning plans: one fixed request per length, then a deliberate timeout. */
if (suite !== 'chat_code_review') {
  const prompt = prompts.learningPlan;
  const planJsonSchema = z.toJSONSchema(prompt.outputSchema);
  const planInput = (durationDays: PlanDurationDays) => ({
    technologyId: 'javascript',
    goal: 'learn_javascript' as const,
    goalDetails: 'I want to build a small quiz game in the browser.',
    durationDays,
    dailyMinutes: 30,
    progress: { previousPlans: 0, completedTasks: 0, completedModules: [] },
  });
  const cost = (input: number, output: number) =>
    env.data.PRICE_INPUT_PER_M !== undefined && env.data.PRICE_OUTPUT_PER_M !== undefined
      ? `$${((input * env.data.PRICE_INPUT_PER_M + output * env.data.PRICE_OUTPUT_PER_M) / 1_000_000).toFixed(5)}`
      : 'no price given (free tier: $0)';
  const call = (durationDays: PlanDurationDays, timeoutMs: number) => {
    const built = prompt.build(planInput(durationDays), learner);
    const requestChars =
      built.system.length +
      built.messages.reduce((sum, message) => sum + message.content.length, 0);
    const startedAt = performance.now();
    const pending = provider.generateStructured({
      task: 'learning_plan',
      ...built,
      outputJsonSchema: planJsonSchema,
      maxOutputTokens: prompt.maxOutputTokens,
      maxResponseChars: PLAN_RESPONSE_MAX_CHARS,
      signal: AbortSignal.timeout(timeoutMs),
      hints: { technologyId: 'javascript', durationDays, dailyMinutes: 30 },
    });
    return { pending, requestChars, startedAt };
  };
  const pause = () => new Promise((resolve) => setTimeout(resolve, env.data.PLAN_PAUSE_MS));

  out(`### Learning plans (${prompt.ref}), timeout ${PLAN_TIMEOUT_MS / 1000} s`);
  out();
  out(
    '| Days | Result | Time | Request chars | Response chars | Tokens in / out | Modules | Tasks | Empty days | Over-budget days | Dropped tasks | Cost |',
  );
  out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const notes: string[] = [];
  for (const [index, durationDays] of PLAN_DURATION_DAYS.entries()) {
    if (index > 0) await pause();
    const { pending, requestChars, startedAt } = call(durationDays, PLAN_TIMEOUT_MS);
    try {
      const raw = await pending;
      const ms = Math.round(performance.now() - startedAt);
      const parsed = prompt.outputSchema.safeParse(raw.output);
      if (!parsed.success) {
        failed = true;
        out(
          `| ${durationDays} | ❌ JSON ok, Zod failed | ${ms} ms | ${requestChars} | ${raw.responseChars} | ${raw.usage.inputTokens} / ${raw.usage.outputTokens} | – | – | – | – | – | ${cost(raw.usage.inputTokens, raw.usage.outputTokens)} |`,
        );
        notes.push(
          `${durationDays} days, Zod: ${parsed.error.issues
            .slice(0, 3)
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ')}`,
        );
        continue;
      }
      const finalized = finalizePlan(parsed.data, { durationDays, dailyMinutes: 30 });
      if (!finalized) {
        failed = true;
        out(
          `| ${durationDays} | ❌ no usable task | ${ms} ms | ${requestChars} | ${raw.responseChars} | ${raw.usage.inputTokens} / ${raw.usage.outputTokens} | – | – | – | – | – | – |`,
        );
        continue;
      }
      const { stats } = finalized;
      out(
        `| ${durationDays} | ✅ JSON, Zod, rules | ${ms} ms | ${requestChars} | ${raw.responseChars} | ${raw.usage.inputTokens} / ${raw.usage.outputTokens} | ${stats.modules} | ${stats.tasks} | ${stats.emptyDays} | ${stats.overBudgetDays} | ${stats.droppedTasks} | ${cost(raw.usage.inputTokens, raw.usage.outputTokens)} |`,
      );
      if (env.data.PLAN_OUTPUT_DIR) {
        mkdirSync(env.data.PLAN_OUTPUT_DIR, { recursive: true });
        writeFileSync(
          join(env.data.PLAN_OUTPUT_DIR, `plan-${durationDays}.json`),
          JSON.stringify({
            durationDays,
            draft: finalized.draft,
            meta: {
              provider: provider.name,
              model: raw.model,
              promptVersion: prompt.ref,
              inputTokens: raw.usage.inputTokens,
              outputTokens: raw.usage.outputTokens,
              latencyMs: ms,
            },
          }),
        );
      }
      if (durationDays === 7) {
        notes.push(
          `7-day sample: "${parsed.data.title}"; day 1: "${parsed.data.tasks[0]?.title ?? ''}"`,
        );
      }
    } catch (error) {
      failed = true;
      const ms = Math.round(performance.now() - startedAt);
      out(
        `| ${durationDays} | ❌ ${ms >= PLAN_TIMEOUT_MS - 500 ? 'timeout' : 'error'} | ${ms} ms | ${requestChars} | – | – | – | – | – | – | – | – |`,
      );
      notes.push(`${durationDays} days: ${describe(error)}`);
    }
  }
  out();
  for (const note of notes) out(`- ${note}`);
  out();

  /* The provider must stop when the timeout fires (the API then answers 504 TIMEOUT). */
  await pause();
  const { pending, startedAt } = call(7, PLAN_SHORT_TIMEOUT_MS);
  try {
    await pending;
    out(`### Timeout check ⚠️`);
    out(`The answer came within ${PLAN_SHORT_TIMEOUT_MS} ms, so the abort could not be observed.`);
  } catch (error) {
    const ms = Math.round(performance.now() - startedAt);
    const aborted = ms < PLAN_SHORT_TIMEOUT_MS + 2_000;
    if (!aborted) failed = true;
    out(`### Timeout check ${aborted ? '✅' : '❌'}`);
    out(
      `A ${PLAN_SHORT_TIMEOUT_MS} ms timeout stopped the call after ${ms} ms: ${describe(error).slice(0, 160)}`,
    );
  }
  out();
}

finish(failed ? 1 : 0);
