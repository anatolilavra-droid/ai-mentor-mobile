import { ApiError, FinishReason, type GenerateContentParameters } from '@google/genai';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createAIProvider } from '../src/services/ai/providers/index.js';
import { AIProviderError } from '../src/services/ai/providers/AIProvider.js';
import {
  createGeminiProvider,
  type GeminiModels,
} from '../src/services/ai/providers/gemini.provider.js';

import { buildTestApp } from './helpers/testApp.js';
import { bearer, signToken, USER_A, USER_B } from './helpers/tokens.js';

type FakeResponse = Record<string, unknown> & { text?: string };

/** A stand-in for the SDK's models.generateContent. Records every request. */
function fakeModels(respond: (params: GenerateContentParameters) => Promise<FakeResponse>) {
  const requests: GenerateContentParameters[] = [];
  const models = {
    generateContent: async (params: GenerateContentParameters) => {
      requests.push(params);
      return respond(params);
    },
  } as unknown as GeminiModels;
  return { models, requests };
}

const ok = (text: string, extra: FakeResponse = {}): FakeResponse => ({
  text,
  modelVersion: 'gemini-test-model-001',
  candidates: [{ finishReason: FinishReason.STOP }],
  usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 20, thoughtsTokenCount: 30 },
  ...extra,
});

const textInput = (signal = new AbortController().signal) => ({
  system: 'You are a mentor.',
  messages: [{ role: 'user' as const, content: '<learner_message>\nHi\n</learner_message>' }],
  maxOutputTokens: 1_500,
  signal,
});

const provider = (respond: Parameters<typeof fakeModels>[0]) => {
  const fake = fakeModels(respond);
  return {
    ...fake,
    gemini: createGeminiProvider({
      apiKey: 'test-key-not-real-000000',
      model: 'gemini-test',
      models: fake.models,
    }),
  };
};

async function expectKind(promise: Promise<unknown>, kind: string) {
  await expect(promise).rejects.toSatisfy(
    (error) => error instanceof AIProviderError && error.kind === kind,
  );
}

describe('Gemini provider', () => {
  it('sends the system prompt, the delimited message and the abort signal', async () => {
    const { gemini, requests } = provider(async () => ok('Answer'));
    const signal = new AbortController().signal;

    const result = await gemini.generateText(textInput(signal));

    expect(requests[0]).toMatchObject({
      model: 'gemini-test',
      contents: [{ role: 'user', parts: [{ text: '<learner_message>\nHi\n</learner_message>' }] }],
      config: { systemInstruction: 'You are a mentor.', abortSignal: signal },
    });
    expect(requests[0]?.config?.maxOutputTokens).toBeGreaterThan(1_500);
    expect(result).toEqual({
      text: 'Answer',
      model: 'gemini-test-model-001',
      usage: { inputTokens: 50, outputTokens: 50 },
      finishReason: 'stop',
    });
  });

  it('maps assistant turns to the model role', async () => {
    const { gemini, requests } = provider(async () => ok('Answer'));
    await gemini.generateText({
      ...textInput(),
      messages: [
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
        { role: 'user', content: 'c' },
      ],
    });

    expect(requests[0]?.contents).toEqual([
      { role: 'user', parts: [{ text: 'a' }] },
      { role: 'model', parts: [{ text: 'b' }] },
      { role: 'user', parts: [{ text: 'c' }] },
    ]);
  });

  it('treats a blocked prompt as a refusal', async () => {
    const { gemini } = provider(async () => ({ promptFeedback: { blockReason: 'SAFETY' } }));
    await expectKind(gemini.generateText(textInput()), 'refused');
  });

  it('treats a safety stop as a refusal', async () => {
    const { gemini } = provider(async () =>
      ok('partial', { candidates: [{ finishReason: FinishReason.SAFETY }] }),
    );
    await expectKind(gemini.generateText(textInput()), 'refused');
  });

  it('rejects an empty answer', async () => {
    const { gemini } = provider(async () =>
      ok('', { candidates: [{ finishReason: FinishReason.MAX_TOKENS }] }),
    );
    await expectKind(gemini.generateText(textInput()), 'invalid_response');
  });

  it.each([
    [429, 'rate_limited'],
    [500, 'unavailable'],
    [503, 'unavailable'],
    [403, 'unavailable'],
    [504, 'timeout'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    const { gemini } = provider(async () => {
      throw new ApiError({ message: 'upstream detail', status });
    });
    await expectKind(gemini.generateText(textInput()), kind);
  });

  it('passes abort errors through untouched', async () => {
    const controller = new AbortController();
    const reason = new Error('stopped');
    const { gemini } = provider(async () => {
      controller.abort(reason);
      throw reason;
    });

    await expect(gemini.generateText(textInput(controller.signal))).rejects.toBe(reason);
  });

  it('asks for JSON with the review schema and parses it', async () => {
    const review = { summary: 'ok', issues: [], nextStep: 'next' };
    const { gemini, requests } = provider(async () => ok(JSON.stringify(review)));
    const schema = { type: 'object' };

    const result = await gemini.reviewCode({
      system: 's',
      messages: [{ role: 'user', content: '<learner_code>\nx\n</learner_code>' }],
      language: 'javascript',
      task: 'explain',
      outputJsonSchema: schema,
      maxOutputTokens: 100,
      signal: new AbortController().signal,
    });

    expect(requests[0]?.config).toMatchObject({
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
    });
    expect(result.output).toEqual(review);
  });

  it('rejects a review that is not JSON', async () => {
    const { gemini } = provider(async () => ok('not json'));
    await expectKind(
      gemini.reviewCode({
        system: 's',
        messages: [],
        language: 'javascript',
        task: 'fix',
        outputJsonSchema: {},
        maxOutputTokens: 100,
        signal: new AbortController().signal,
      }),
      'invalid_response',
    );
  });

  it('is built by the factory without any network call', () => {
    const gemini = createAIProvider({
      provider: 'gemini',
      apiKey: 'test-key-not-real-000000',
      model: 'gemini-test',
    });
    expect(gemini.name).toBe('gemini');
  });
});

describe('real provider allowlist', () => {
  function geminiForApp() {
    const fake = fakeModels(async () => ok('Real Gemini answer'));
    return {
      requests: fake.requests,
      provider: createGeminiProvider({
        apiKey: 'test-key-not-real-000000',
        model: 'gemini-test',
        models: fake.models,
      }),
    };
  }

  it('sends only allowed users to the real provider', async () => {
    const { provider: gemini, requests } = geminiForApp();
    const { app } = buildTestApp({ aiProvider: gemini, config: { realAiUserIds: [USER_A] } });

    const allowed = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken({ sub: USER_A })))
      .send({ message: 'Hi' });

    expect(allowed.status).toBe(200);
    expect(allowed.body.provider).toBe('gemini');
    expect(allowed.body.answer).toBe('Real Gemini answer');
    expect(requests).toHaveLength(1);
  });

  it('gives everyone else the mock, so their data never reaches Gemini', async () => {
    const { provider: gemini, requests } = geminiForApp();
    const { app } = buildTestApp({ aiProvider: gemini, config: { realAiUserIds: [USER_A] } });

    const other = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken({ sub: USER_B })))
      .send({ message: 'My private question' });

    expect(other.status).toBe(200);
    expect(other.body.provider).toBe('mock');
    expect(requests).toHaveLength(0);
  });

  it('gives everyone the mock when the allowlist is empty', async () => {
    const { provider: gemini, requests } = geminiForApp();
    const { app } = buildTestApp({ aiProvider: gemini });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken({ sub: USER_A })))
      .send({ message: 'Hi' });

    expect(res.body.provider).toBe('mock');
    expect(requests).toHaveLength(0);
  });

  it('turns a Gemini refusal into a safe 502 without its details', async () => {
    const fake = fakeModels(async () => ({ promptFeedback: { blockReason: 'SAFETY' } }));
    const gemini = createGeminiProvider({
      apiKey: 'test-key-not-real-000000',
      model: 'gemini-test',
      models: fake.models,
    });
    const { app, supabase } = buildTestApp({
      aiProvider: gemini,
      config: { realAiUserIds: [USER_A] },
    });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken({ sub: USER_A })))
      .send({ message: 'Hi' });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_PROVIDER_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('SAFETY');
    expect(supabase.usage.get(USER_A)?.chat ?? 0).toBe(0);
  });
});
