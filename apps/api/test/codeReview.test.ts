import {
  CODE_REVIEW_ACTIONS,
  MAX_CODE_REVIEW_CHARS,
  MAX_CODE_REVIEW_LINES,
  codeReviewResponseSchema,
  errorResponseSchema,
} from '@ai-mentor/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
  AIProviderError,
  type AIProvider,
  type CodeReviewInput,
} from '../src/services/ai/providers/AIProvider.js';
import { createMockProvider } from '../src/services/ai/providers/mock.provider.js';

import { buildTestApp } from './helpers/testApp.js';
import { bearer, signToken, USER_A } from './helpers/tokens.js';

const CODE = 'function add(a, b) {\n  a + b;\n}\n';

async function postReview(app: Parameters<typeof request>[0], body: unknown, token?: string) {
  return request(app)
    .post('/api/ai/code-review')
    .set('Authorization', bearer(token ?? (await signToken())))
    .send(body as object);
}

const validAnswer = {
  summary: 'The function never returns the sum.',
  issues: [
    {
      severity: 'info',
      category: 'style',
      line: 1,
      title: 'Name',
      explanation: 'Fine name.',
      suggestion: '',
    },
    {
      severity: 'error',
      category: 'bug',
      line: 2,
      title: 'Missing return',
      explanation: 'The sum is computed and dropped.',
      suggestion: 'Return a + b.',
    },
    {
      severity: 'warning',
      category: 'bug',
      line: 99,
      title: 'Out of range line',
      explanation: 'The model guessed a line that does not exist.',
      suggestion: 'Check it.',
    },
  ],
  steps: ['Declares add.', 'Adds the numbers.'],
  fixedCode: 'function add(a, b) {\n  return a + b;\n}\n',
  changes: ['Returns the sum.'],
  nextStep: 'Write a test for add().',
  confidence: 'high',
};

/** A provider that records its input and answers with `output`. */
function recordingProvider(output: unknown = validAnswer) {
  const inputs: CodeReviewInput[] = [];
  const provider: AIProvider = {
    ...createMockProvider(),
    name: 'gemini',
    reviewCode: async (input) => {
      inputs.push(input);
      return { output, model: 'gemini-test', usage: { inputTokens: 10, outputTokens: 20 } };
    },
  };
  return { provider, inputs };
}

describe('POST /api/ai/code-review', () => {
  it.each(CODE_REVIEW_ACTIONS)('answers "%s" through the full pipeline (mock)', async (action) => {
    const { app } = buildTestApp();
    const res = await postReview(app, { language: 'javascript', action, code: CODE });

    expect(res.status).toBe(200);
    const body = codeReviewResponseSchema.parse(res.body);
    expect(body.provider).toBe('mock');
    expect(body.promptVersion).toBe('code-review/v2');
    expect(body.requestId).toBe(res.headers['x-request-id']);
    expect(body.input).toEqual({ language: 'javascript', action, chars: CODE.length, lines: 3 });
    expect(body.usage.quota).toEqual({ used: 1, limit: 10, period: 'month' });
    expect(Boolean(body.review.steps)).toBe(action === 'explain');
    expect(Boolean(body.review.fixedCode)).toBe(action === 'fix' || action === 'improve');
    expect(JSON.stringify(body)).not.toContain('"code"');
  });

  it('normalizes the code, finalizes the review and never returns the code', async () => {
    const { provider, inputs } = recordingProvider();
    const { app } = buildTestApp({ aiProvider: provider, config: { realAiUserIds: [USER_A] } });
    const res = await postReview(app, {
      language: 'javascript',
      action: 'fix',
      code: CODE.replace(/\n/g, '\r\n'),
    });

    expect(res.status).toBe(200);
    const body = codeReviewResponseSchema.parse(res.body);
    expect(body.provider).toBe('gemini');
    expect(body.review.issues.map((issue) => issue.severity)).toEqual(['error', 'warning', 'info']);
    expect(body.review.issues.find((issue) => issue.title === 'Out of range line')?.line).toBe(
      undefined,
    );
    expect(body.review.steps).toBeUndefined();
    expect(body.review.fixedCode).toBe(validAnswer.fixedCode);
    expect(inputs[0]?.action).toBe('fix');
    expect(inputs[0]?.messages[0]?.content).toContain('function add(a, b) {\n  a + b;\n}');
    expect(inputs[0]?.messages[0]?.content).not.toContain('\r');
  });

  it('requires a session', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post('/api/ai/code-review')
      .send({ language: 'javascript', action: 'fix', code: CODE });

    expect(res.status).toBe(401);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('UNAUTHORIZED');
  });

  it.each([
    ['an unknown language', { language: 'ruby', action: 'fix', code: CODE }],
    ['an unknown action', { language: 'python', action: 'run', code: CODE }],
    ['an extra field', { language: 'python', action: 'fix', code: CODE, plan: 'pro' }],
    ['a missing code', { language: 'python', action: 'fix' }],
  ])('rejects %s with 400', async (_name, body) => {
    const { app, supabase } = buildTestApp();
    const res = await postReview(app, body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(supabase.usage.get(USER_A)?.code_review ?? 0).toBe(0);
  });

  it.each([
    ['empty', '   \n ', 'empty'],
    ['too many characters', 'a'.repeat(MAX_CODE_REVIEW_CHARS + 1), 'tooManyChars'],
    [
      'too many lines',
      Array.from({ length: MAX_CODE_REVIEW_LINES + 1 }, () => 'x').join('\n'),
      'tooManyLines',
    ],
    ['a NUL character', 'a\0b', 'invalidCharacters'],
  ])('rejects %s code with a stable detail key', async (_name, code, key) => {
    const { provider, inputs } = recordingProvider();
    const { app } = buildTestApp({ aiProvider: provider });
    const res = await postReview(app, { language: 'python', action: 'review', code });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ path: 'code', message: key }]);
    expect(inputs).toHaveLength(0);
  });

  it('accepts code exactly at both limits', async () => {
    const { app } = buildTestApp({ config: { jsonBodyLimit: '256kb' } });
    const chars = await postReview(app, {
      language: 'json',
      action: 'review',
      code: 'a'.repeat(MAX_CODE_REVIEW_CHARS),
    });
    const lines = await postReview(app, {
      language: 'json',
      action: 'review',
      code: Array.from({ length: MAX_CODE_REVIEW_LINES }, () => '1').join('\n'),
    });

    expect(chars.status).toBe(200);
    expect(lines.status).toBe(200);
  });

  it('returns USAGE_LIMIT_REACHED for code_review without calling the provider', async () => {
    const { provider, inputs } = recordingProvider();
    const { app } = buildTestApp({
      aiProvider: provider,
      config: { realAiUserIds: [USER_A] },
      supabase: { usage: { [USER_A]: { code_review: 10 } } },
    });
    const res = await postReview(app, { language: 'css', action: 'improve', code: 'a{}' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('USAGE_LIMIT_REACHED');
    expect(res.body.error.quota).toMatchObject({ feature: 'code_review', used: 10, limit: 10 });
    expect(inputs).toHaveLength(0);
  });

  it('does not count invalid AI answers against the quota', async () => {
    const { provider } = recordingProvider({ summary: 'no other fields' });
    const { app, supabase } = buildTestApp({
      aiProvider: provider,
      config: { realAiUserIds: [USER_A] },
    });
    const res = await postReview(app, { language: 'html', action: 'review', code: '<p>' });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_INVALID_RESPONSE');
    expect(supabase.usage.get(USER_A)?.code_review ?? 0).toBe(0);
  });

  it('maps provider failures to typed errors', async () => {
    const provider: AIProvider = {
      ...createMockProvider(),
      reviewCode: async () => {
        throw new AIProviderError('rate_limited', 'Gemini rate limit');
      },
    };
    const { app } = buildTestApp({ aiProvider: provider });
    const res = await postReview(app, { language: 'python', action: 'fix', code: 'print(1' });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_PROVIDER_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('Gemini');
  });

  it('never logs the code or the answer', async () => {
    const marker = 'SECRET_MARKER_7f3a';
    const { provider } = recordingProvider({ ...validAnswer, summary: `About ${marker}x` });
    const { app, logs } = buildTestApp({
      aiProvider: provider,
      config: { realAiUserIds: [USER_A] },
    });
    const res = await postReview(app, {
      language: 'javascript',
      action: 'fix',
      code: `const key = "${marker}";`,
    });

    expect(res.status).toBe(200);
    expect(logs.text()).not.toContain(marker);
    expect(logs.text()).toContain('"codeReview":{"language":"javascript","action":"fix"');
  });
});

describe('code review timeouts', () => {
  /** A slow mock review that remembers whether it was told to stop. */
  function slowReview(delayMs: number) {
    const state = { aborted: false };
    const mock = createMockProvider({ delayMs });
    const provider: AIProvider = {
      ...mock,
      reviewCode: (input) => {
        input.signal.addEventListener('abort', () => (state.aborted = true), { once: true });
        return mock.reviewCode(input);
      },
    };
    return { provider, state };
  }

  it('uses its own AI timeout, aborts the provider and keeps the quota', async () => {
    const { provider, state } = slowReview(1_000);
    const { app, supabase } = buildTestApp({
      aiProvider: provider,
      config: { aiTimeoutMs: 5_000, codeReviewAiTimeoutMs: 50 },
    });
    const res = await postReview(app, { language: 'javascript', action: 'fix', code: CODE });

    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe('TIMEOUT');
    expect(state.aborted).toBe(true);
    expect(supabase.usage.get(USER_A)?.code_review ?? 0).toBe(0);
  });

  it('is not cut by the shorter chat timeout', async () => {
    const { provider } = slowReview(150);
    const { app } = buildTestApp({
      aiProvider: provider,
      config: { aiTimeoutMs: 50, codeReviewAiTimeoutMs: 2_000 },
    });
    const res = await postReview(app, { language: 'javascript', action: 'explain', code: CODE });

    expect(res.status).toBe(200);
  });
});
