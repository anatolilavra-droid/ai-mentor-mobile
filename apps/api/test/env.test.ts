import { describe, expect, it } from 'vitest';

import { parseEnv } from '../src/config/env.js';

const valid = {
  SUPABASE_URL: 'https://test-project.supabase.co/',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_value',
};

describe('parseEnv', () => {
  it('applies safe defaults', () => {
    const result = parseEnv(valid);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      SUPABASE_URL: 'https://test-project.supabase.co',
      AI_PROVIDER: 'mock',
      AI_TIMEOUT_MS: 30_000,
      REQUEST_TIMEOUT_MS: 40_000,
      TRUST_PROXY: 0,
    });
  });

  it('names a missing variable without printing any value', () => {
    const result = parseEnv({ SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_super_secret_value' });

    expect(result).toEqual({ ok: false, problems: ['SUPABASE_URL: missing or invalid'] });
    expect(JSON.stringify(result)).not.toContain('super_secret');
  });

  it('requires the request timeout to be longer than the AI timeout', () => {
    const result = parseEnv({ ...valid, AI_TIMEOUT_MS: '30000', REQUEST_TIMEOUT_MS: '30000' });

    expect(result).toEqual({
      ok: false,
      problems: ['REQUEST_TIMEOUT_MS: must be greater than AI_TIMEOUT_MS'],
    });
  });

  it('refuses the mock provider in production', () => {
    const result = parseEnv({ ...valid, NODE_ENV: 'production' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual(['AI_PROVIDER: the mock provider must not run in production']);
  });

  it('accepts only known AI providers', () => {
    expect(parseEnv({ ...valid, AI_PROVIDER: 'openai' }).ok).toBe(false);
  });

  it('refuses mobile EXPO_PUBLIC_ variables in the API environment', () => {
    const result = parseEnv({ ...valid, EXPO_PUBLIC_AI_KEY: 'should-never-be-here' });

    expect(result).toEqual({
      ok: false,
      problems: ['EXPO_PUBLIC_AI_KEY: mobile variables do not belong in the API'],
    });
  });

  it.each([
    ['PORT', 'abc'],
    ['JSON_BODY_LIMIT', '10mb'],
    ['TRUST_PROXY', 'true'],
    ['SUPABASE_URL', 'ftp://example.com'],
  ])('rejects an invalid %s', (name, value) => {
    expect(parseEnv({ ...valid, [name]: value }).ok).toBe(false);
  });
});
