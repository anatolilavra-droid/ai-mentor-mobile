import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { meResponseSchema } from '../src/schemas/me.schema.js';

import { createFakeSupabase, profileRow } from './helpers/fakeSupabase.js';
import { buildTestApp } from './helpers/testApp.js';
import { bearer, signToken, USER_A, USER_B } from './helpers/tokens.js';

describe('GET /api/me', () => {
  it('returns the signed-in user profile for a valid JWT', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', bearer(await signToken()));

    expect(res.status).toBe(200);
    expect(meResponseSchema.parse(res.body)).toEqual({
      userId: USER_A,
      displayName: 'Alice',
      experienceLevel: 'beginner',
      primaryGoal: 'learn_javascript',
      dailyMinutes: 30,
      uiLanguage: 'en',
      onboardingCompleted: true,
    });
  });

  it('rejects a request without a JWT', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it.each([
    ['malformed', 'Bearer not-a-jwt'],
    ['wrong scheme', 'Basic dXNlcjpwYXNz'],
    ['garbage token', 'Bearer aaa.bbb.ccc'],
  ])('rejects an invalid JWT (%s)', async (_name, header) => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/me').set('Authorization', header);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an expired JWT', async () => {
    const { app } = buildTestApp();
    const token = await signToken({ expiresIn: -120 });
    const res = await request(app).get('/api/me').set('Authorization', bearer(token));

    expect(res.status).toBe(401);
  });

  describe('row level security', () => {
    it('queries as the user: their token and their id, never another user', async () => {
      const supabase = createFakeSupabase();
      const { app } = buildTestApp({ createUserClient: supabase.factory });
      const token = await signToken({ sub: USER_B });

      const res = await request(app).get('/api/me').set('Authorization', bearer(token));

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(USER_B);
      expect(supabase.accessTokens).toEqual([token]);
      expect(supabase.filters).toEqual([{ table: 'profiles', column: 'id', value: USER_B }]);
    });

    it('does not accept a user id from the client', async () => {
      const { app } = buildTestApp();
      const res = await request(app)
        .get(`/api/me?id=${USER_B}`)
        .set('Authorization', bearer(await signToken({ sub: USER_A })));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('cannot see another user row even if it is the only row', async () => {
      const supabase = createFakeSupabase({ rows: [profileRow(USER_B)] });
      const { app } = buildTestApp({ createUserClient: supabase.factory });

      const res = await request(app)
        .get('/api/me')
        .set('Authorization', bearer(await signToken({ sub: USER_A })));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
    });
  });

  it('returns 404 PROFILE_NOT_FOUND when the profile does not exist', async () => {
    const supabase = createFakeSupabase({ rows: [] });
    const { app } = buildTestApp({ createUserClient: supabase.factory });
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', bearer(await signToken()));

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({
      code: 'PROFILE_NOT_FOUND',
      message: 'Your profile was not found.',
    });
  });

  it('returns 503 when Supabase fails, without leaking its message', async () => {
    const supabase = createFakeSupabase({
      failure: { status: 500, message: 'relation "profiles" internal detail' },
    });
    const { app } = buildTestApp({ createUserClient: supabase.factory });
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', bearer(await signToken()));

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(res.body)).not.toContain('internal detail');
  });

  it('returns 401 when PostgREST rejects the token', async () => {
    const supabase = createFakeSupabase({ failure: { status: 401, message: 'JWT expired' } });
    const { app } = buildTestApp({ createUserClient: supabase.factory });
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', bearer(await signToken()));

    expect(res.status).toBe(401);
  });

  it('returns 500 without details when the row has an unexpected shape', async () => {
    const supabase = createFakeSupabase({
      rows: [profileRow(USER_A, { experience_level: 'wizard' })],
    });
    const { app } = buildTestApp({ createUserClient: supabase.factory });
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', bearer(await signToken()));

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/wizard|stack|ZodError/);
  });
});
