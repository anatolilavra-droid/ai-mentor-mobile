import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { buildTestApp } from './helpers/testApp.js';
import { bearer, signToken, USER_A, USER_B } from './helpers/tokens.js';

describe('rate limiting', () => {
  it('limits AI requests per user with 429 RATE_LIMITED and Retry-After', async () => {
    const { app } = buildTestApp({ config: { rateLimitAi: { max: 2, windowMs: 60_000 } } });
    const token = await signToken({ sub: USER_A });
    const send = () =>
      request(app).post('/api/ai/chat').set('Authorization', bearer(token)).send({ message: 'Hi' });

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const limited = await send();

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(limited.body.error.requestId).toBe(limited.headers['x-request-id']);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('keeps separate limits for different users', async () => {
    const { app } = buildTestApp({ config: { rateLimitAi: { max: 1, windowMs: 60_000 } } });
    const tokenA = await signToken({ sub: USER_A });
    const tokenB = await signToken({ sub: USER_B });
    const send = (token: string) =>
      request(app).post('/api/ai/chat').set('Authorization', bearer(token)).send({ message: 'Hi' });

    expect((await send(tokenA)).status).toBe(200);
    expect((await send(tokenA)).status).toBe(429);
    expect((await send(tokenB)).status).toBe(200);
  });

  it('does not count unauthenticated requests against a user', async () => {
    const { app } = buildTestApp({ config: { rateLimitAi: { max: 1, windowMs: 60_000 } } });
    await request(app).post('/api/ai/chat').send({ message: 'Hi' });
    await request(app).post('/api/ai/chat').send({ message: 'Hi' });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken()))
      .send({ message: 'Hi' });
    expect(res.status).toBe(200);
  });

  it('applies the per-IP limit to every route', async () => {
    const { app } = buildTestApp({ config: { rateLimitIp: { max: 2, windowMs: 60_000 } } });

    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/health')).status).toBe(200);
    const limited = await request(app).get('/health');
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
  });
});
