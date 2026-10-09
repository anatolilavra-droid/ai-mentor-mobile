import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
  errorResponseSchema,
  subscriptionResponseSchema,
  usageResponseSchema,
} from '@ai-mentor/shared';
import { AIProviderError, type AIProvider } from '../src/services/ai/providers/AIProvider.js';
import { createMockProvider } from '../src/services/ai/providers/mock.provider.js';

import { buildTestApp } from './helpers/testApp.js';
import { bearer, signToken, USER_A, USER_B } from './helpers/tokens.js';

async function chat(app: Parameters<typeof request>[0], sub = USER_A) {
  return request(app)
    .post('/api/ai/chat')
    .set('Authorization', bearer(await signToken({ sub })))
    .send({ message: 'Hi' });
}

describe('monthly AI quota', () => {
  it('counts each successful answer and reports the quota after it', async () => {
    const { app, supabase } = buildTestApp();

    const first = await chat(app);
    const second = await chat(app);

    expect(first.body.usage.quota).toEqual({ used: 1, limit: 30, period: 'month' });
    expect(second.body.usage.quota).toEqual({ used: 2, limit: 30, period: 'month' });
    expect(supabase.usage.get(USER_A)?.chat).toBe(2);
  });

  it('refuses the 31st Free message with quota details and does not call the AI', async () => {
    let calls = 0;
    const provider: AIProvider = {
      ...createMockProvider(),
      generateText: async (input) => {
        calls += 1;
        return createMockProvider().generateText(input);
      },
    };
    const { app, supabase } = buildTestApp({
      aiProvider: provider,
      supabase: { usage: { [USER_A]: { chat: 30 } } },
    });

    const res = await chat(app);

    expect(res.status).toBe(429);
    const { error } = errorResponseSchema.parse(res.body);
    expect(error.code).toBe('USAGE_LIMIT_REACHED');
    expect(error.quota).toMatchObject({ feature: 'chat', used: 30, limit: 30 });
    expect(error.quota?.resetsAt).toMatch(/^\d{4}-\d{2}-01T00:00:00\.000Z$/);
    expect(calls).toBe(0);
    expect(supabase.usage.get(USER_A)?.chat).toBe(30);
  });

  it('gives Pro limits from the database, never from the client', async () => {
    const { app } = buildTestApp({
      supabase: {
        subscriptions: [{ user_id: USER_A, plan: 'pro', status: 'active' }],
        usage: { [USER_A]: { chat: 30 } },
      },
    });

    const res = await chat(app);

    expect(res.status).toBe(200);
    expect(res.body.usage.quota).toEqual({ used: 31, limit: 500, period: 'month' });
  });

  it('treats a canceled Pro subscription as Free', async () => {
    const { app } = buildTestApp({
      supabase: {
        subscriptions: [{ user_id: USER_A, plan: 'pro', status: 'canceled' }],
        usage: { [USER_A]: { chat: 30 } },
      },
    });

    expect((await chat(app)).status).toBe(429);
  });

  it('does not count a failed AI call', async () => {
    const provider: AIProvider = {
      ...createMockProvider(),
      generateText: async () => {
        throw new AIProviderError('unavailable', 'down');
      },
    };
    const { app, supabase } = buildTestApp({ aiProvider: provider });

    expect((await chat(app)).status).toBe(502);
    expect(supabase.usage.get(USER_A)?.chat ?? 0).toBe(0);
  });

  it('fails closed with 503 when the quota cannot be read', async () => {
    let calls = 0;
    const provider: AIProvider = {
      ...createMockProvider(),
      generateText: async (input) => {
        calls += 1;
        return createMockProvider().generateText(input);
      },
    };
    const { app } = buildTestApp({
      aiProvider: provider,
      supabase: { rpcFailure: { status: 500, message: 'db down' } },
    });

    const res = await chat(app);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(calls).toBe(0);
  });

  it('runs the usage functions as the caller', async () => {
    const { app, supabase } = buildTestApp();
    await chat(app, USER_B);

    expect(supabase.rpcCalls.map((call) => [call.name, call.sub])).toEqual([
      ['get_my_ai_quotas', USER_B],
      ['record_my_ai_usage', USER_B],
    ]);
    expect(supabase.rpcCalls[1]?.args).toMatchObject({ p_feature: 'chat' });
  });
});

describe('GET /api/usage', () => {
  it('returns the caller plan, period and usage only', async () => {
    const { app } = buildTestApp({
      supabase: { usage: { [USER_A]: { chat: 3, code_review: 1 }, [USER_B]: { chat: 9 } } },
    });
    const res = await request(app)
      .get('/api/usage')
      .set('Authorization', bearer(await signToken({ sub: USER_A })));

    expect(res.status).toBe(200);
    const body = usageResponseSchema.parse(res.body);
    expect(body.plan).toBe('free');
    expect(body.features).toEqual({
      chat: { used: 3, limit: 30 },
      code_review: { used: 1, limit: 10 },
    });
    expect(body.period.start < body.period.end).toBe(true);
  });

  it('requires authentication', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/usage')).status).toBe(401);
  });

  it('does not accept a user id from the client', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .get(`/api/usage?userId=${USER_B}`)
      .set('Authorization', bearer(await signToken()));

    expect(res.status).toBe(400);
  });
});

describe('GET /api/subscription', () => {
  it.each([
    ['no subscription row', [], { plan: 'free', status: 'active' }],
    [
      'active Pro',
      [{ user_id: USER_A, plan: 'pro' as const, status: 'active' as const }],
      { plan: 'pro', status: 'active' },
    ],
    [
      'canceled Pro',
      [{ user_id: USER_A, plan: 'pro' as const, status: 'canceled' as const }],
      { plan: 'free', status: 'canceled' },
    ],
    [
      'another user on Pro',
      [{ user_id: USER_B, plan: 'pro' as const, status: 'active' as const }],
      { plan: 'free', status: 'active' },
    ],
  ])('returns the caller plan: %s', async (_name, subscriptions, expected) => {
    const { app } = buildTestApp({ supabase: { subscriptions } });
    const res = await request(app)
      .get('/api/subscription')
      .set('Authorization', bearer(await signToken({ sub: USER_A })));

    expect(res.status).toBe(200);
    expect(subscriptionResponseSchema.parse(res.body)).toEqual(expected);
  });

  it('requires authentication', async () => {
    const { app } = buildTestApp();
    expect((await request(app).get('/api/subscription')).status).toBe(401);
  });
});
