import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { buildTestApp } from './helpers/testApp.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('request id', () => {
  it('creates a UUID when the client sends none', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/health');

    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('reuses a well-formed incoming id', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/health').set('X-Request-Id', 'mobile-req-12345678');

    expect(res.headers['x-request-id']).toBe('mobile-req-12345678');
  });

  it.each([
    ['too short', 'abc'],
    ['unsafe characters', 'abc12345\nfake log line'],
    ['too long', 'a'.repeat(65)],
  ])('replaces an id that is %s', async (_name, incoming) => {
    const { app } = buildTestApp();
    const res = await request(app).get('/health').set('X-Request-Id', incoming.replace('\n', ' '));

    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('puts the same id in the error body', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/nope').set('X-Request-Id', 'trace-abcdef12');

    expect(res.body.error.requestId).toBe('trace-abcdef12');
  });
});
