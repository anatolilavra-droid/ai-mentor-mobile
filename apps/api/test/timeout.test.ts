import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { AIProvider } from '../src/services/ai/providers/AIProvider.js';
import { createMockProvider } from '../src/services/ai/providers/mock.provider.js';

import { buildTestApp } from './helpers/testApp.js';
import { bearer, signToken } from './helpers/tokens.js';

/** A slow mock that remembers whether it was told to stop. */
function slowProvider(delayMs: number) {
  const state = { aborted: false };
  const mock = createMockProvider({ delayMs });
  const provider: AIProvider = {
    ...mock,
    generateText: (input) => {
      input.signal.addEventListener('abort', () => (state.aborted = true), { once: true });
      return mock.generateText(input);
    },
  };
  return { provider, state };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('timeouts', () => {
  it('returns 504 TIMEOUT and aborts the provider when the AI call is too slow', async () => {
    const { provider, state } = slowProvider(1_000);
    const { app } = buildTestApp({ aiProvider: provider, config: { aiTimeoutMs: 50 } });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken()))
      .send({ message: 'Hi' });

    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe('TIMEOUT');
    expect(state.aborted).toBe(true);
  });

  it('returns 504 TIMEOUT when the whole request takes too long', async () => {
    const { provider, state } = slowProvider(1_000);
    const { app } = buildTestApp({
      aiProvider: provider,
      config: { aiTimeoutMs: 5_000, requestTimeoutMs: 80 },
    });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken()))
      .send({ message: 'Hi' });

    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe('TIMEOUT');
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
    expect(state.aborted).toBe(true);
  });

  it('aborts the provider when the client disconnects', async () => {
    const { provider, state } = slowProvider(1_000);
    const { app } = buildTestApp({ aiProvider: provider, config: { aiTimeoutMs: 5_000 } });

    await expect(
      request(app)
        .post('/api/ai/chat')
        .set('Authorization', bearer(await signToken()))
        .send({ message: 'Hi' })
        .timeout(100),
    ).rejects.toThrow();
    await wait(50);

    expect(state.aborted).toBe(true);
  });
});
