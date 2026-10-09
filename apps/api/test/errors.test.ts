import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorResponseSchema } from '../src/schemas/error.schema.js';

import { buildTestApp } from './helpers/testApp.js';
import { bearer, signToken } from './helpers/tokens.js';

describe('error format', () => {
  it('answers unknown routes with 404 NOT_FOUND in the standard format', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/unknown');

    expect(res.status).toBe(404);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });

  it('answers malformed JSON with 400 VALIDATION_ERROR', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken()))
      .set('Content-Type', 'application/json')
      .send('{"message": ');

    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('VALIDATION_ERROR');
  });

  it('answers an oversized body with 413 PAYLOAD_TOO_LARGE', async () => {
    const { app } = buildTestApp({ config: { jsonBodyLimit: '1kb' } });
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken()))
      .send({ message: 'a'.repeat(2_000) });

    expect(res.status).toBe(413);
    expect(errorResponseSchema.parse(res.body).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('accepts the maximum Cyrillic message within the default body limit', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken()))
      .send({ message: 'я'.repeat(10_000) });

    expect(res.status).toBe(200);
  });

  it('includes field details only for validation errors', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken()))
      .send({ message: '' });

    expect(errorResponseSchema.parse(res.body).error.details).toEqual([
      { path: 'message', message: expect.any(String) },
    ]);
  });

  it('sets security headers and hides the framework', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('GET /health', () => {
  it('reports liveness without internal details', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({
      status: 'ok',
      version: '0.0.0-test',
      uptimeSeconds: expect.any(Number),
    });
  });
});
