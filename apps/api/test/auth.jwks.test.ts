import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createJwksVerifier } from '../src/auth/jwksVerifier.js';
import { AppError } from '../src/errors/AppError.js';

import { foreignKeys, jwksFetch, TEST_SUPABASE_URL } from './helpers/keys.js';
import { buildTestApp } from './helpers/testApp.js';
import { bearer, signHs256Token, signToken, unsignedToken, USER_A } from './helpers/tokens.js';

const verifier = createJwksVerifier({ supabaseUrl: TEST_SUPABASE_URL, fetchImpl: jwksFetch });

async function expectCode(token: string, code: string) {
  await expect(verifier.verify(token)).rejects.toSatisfy(
    (error) => error instanceof AppError && error.code === code,
  );
}

describe('JWKS token verifier', () => {
  it('accepts a valid ES256 Supabase access token', async () => {
    await expect(verifier.verify(await signToken())).resolves.toEqual({ userId: USER_A });
  });

  it('accepts a token that expired within the clock tolerance', async () => {
    await expect(verifier.verify(await signToken({ expiresIn: -10 }))).resolves.toEqual({
      userId: USER_A,
    });
  });

  it.each([
    ['expired', () => signToken({ expiresIn: -120 })],
    ['wrong issuer', () => signToken({ issuer: 'https://evil.example.com/auth/v1' })],
    ['wrong audience', () => signToken({ audience: 'anon' })],
    ['anon role', () => signToken({ role: 'anon' })],
    ['service_role role', () => signToken({ role: 'service_role' })],
    ['non-uuid subject', () => signToken({ sub: 'not-a-uuid' })],
    ['forged signature (unknown key, same kid)', () => signToken({ key: foreignKeys.privateKey })],
    ['unknown kid', () => signToken({ kid: 'unknown-key' })],
    ['HS256 shared-secret token', () => signHs256Token()],
    ['alg none', async () => unsignedToken()],
  ])('rejects %s with UNAUTHORIZED', async (_name, makeToken) => {
    await expectCode(await makeToken(), 'UNAUTHORIZED');
  });

  it('returns SERVICE_UNAVAILABLE when the JWKS cannot be fetched', async () => {
    const offline = createJwksVerifier({
      supabaseUrl: TEST_SUPABASE_URL,
      fetchImpl: async () => {
        throw new TypeError('fetch failed');
      },
    });
    await expect(offline.verify(await signToken())).rejects.toSatisfy(
      (error) => error instanceof AppError && error.code === 'SERVICE_UNAVAILABLE',
    );
  });

  it('returns SERVICE_UNAVAILABLE when the JWKS endpoint answers with an error', async () => {
    const broken = createJwksVerifier({
      supabaseUrl: TEST_SUPABASE_URL,
      fetchImpl: async () => new Response('oops', { status: 500 }),
    });
    await expect(broken.verify(await signToken())).rejects.toSatisfy(
      (error) => error instanceof AppError && error.code === 'SERVICE_UNAVAILABLE',
    );
  });

  it('answers 503 over HTTP when the JWKS is unreachable', async () => {
    const { app } = buildTestApp({
      tokenVerifier: createJwksVerifier({
        supabaseUrl: TEST_SUPABASE_URL,
        fetchImpl: async () => {
          throw new TypeError('fetch failed');
        },
      }),
    });
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', bearer(await signToken()));

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('gives the same message for every rejected token', async () => {
    const { app } = buildTestApp();
    const expired = await request(app)
      .get('/api/me')
      .set('Authorization', bearer(await signToken({ expiresIn: -120 })));
    const forged = await request(app)
      .get('/api/me')
      .set('Authorization', bearer(await signToken({ key: foreignKeys.privateKey })));

    expect(expired.body.error.message).toBe(forged.body.error.message);
  });
});
