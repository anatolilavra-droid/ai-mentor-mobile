/**
 * Manual smoke test of the real AI provider (GitHub Actions "AI smoke test").
 *
 * - Without AI_MODEL: lists the Gemini models this key can use, so the exact
 *   model id can be copied instead of guessed.
 * - With AI_MODEL: sends one fixed learning question and one tiny code review
 *   through the real adapter and prompts, and validates both answers.
 *
 * Only fixed sample content is sent: no user data. The key is read from the
 * environment and never printed.
 */
import { appendFileSync } from 'node:fs';

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

import { prompts } from '../src/prompts/registry.js';
import type { LearnerContext } from '../src/prompts/types.js';
import { generateTextResultSchema } from '../src/services/ai/providers/AIProvider.js';
import { createGeminiProvider } from '../src/services/ai/providers/gemini.provider.js';

const TIMEOUT_MS = 60_000;

const env = z
  .object({
    GEMINI_API_KEY: z.string().min(20),
    AI_MODEL: z
      .string()
      .regex(/^[a-z0-9][a-z0-9.-]{2,63}$/)
      .optional()
      .or(z.literal('').transform(() => undefined)),
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
const { GEMINI_API_KEY: apiKey, AI_MODEL: model } = env.data;

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

const provider = createGeminiProvider({ apiKey, model });
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

/* 1. A fixed learning question through chat/v1. */
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

/* 2. A tiny fixed code review through code-review/v1 with JSON output. */
try {
  const prompt = prompts.codeReview;
  const built = prompt.build(
    { language: 'javascript', task: 'fix', code: 'const total = 0;\ntotal = total + 1;' },
    learner,
  );
  const startedAt = performance.now();
  const raw = await provider.reviewCode({
    ...built,
    language: 'javascript',
    task: 'fix',
    outputJsonSchema: z.toJSONSchema(prompt.outputSchema),
    maxOutputTokens: prompt.maxOutputTokens,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const review = prompt.outputSchema.parse(raw.output);
  out(`### Code review (${prompt.ref}) ✅`);
  out(
    `${Math.round(performance.now() - startedAt)} ms, ` +
      `${raw.usage.inputTokens} input / ${raw.usage.outputTokens} output tokens, ` +
      `${review.issues.length} issue(s); the answer matches the review schema.`,
  );
  out();
  out('```json');
  out(JSON.stringify(review, null, 2));
  out('```');
} catch (error) {
  failed = true;
  out(`### Code review ❌`);
  out(describe(error));
}

finish(failed ? 1 : 0);
