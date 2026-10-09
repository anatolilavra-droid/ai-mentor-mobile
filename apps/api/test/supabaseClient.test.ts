import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClient = vi.fn(() => ({ from: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

const { createUserDataClientFactory } = await import('../src/lib/supabase.js');

describe('createUserDataClientFactory', () => {
  beforeEach(() => createClient.mockClear());

  it('uses only the publishable key and the user access token, without a session', () => {
    const factory = createUserDataClientFactory({
      supabaseUrl: 'https://test-project.supabase.co',
      publishableKey: 'sb_publishable_test_key_value',
    });

    factory('user-access-token');

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(
      'https://test-project.supabase.co',
      'sb_publishable_test_key_value',
      expect.objectContaining({
        global: expect.objectContaining({
          headers: { Authorization: 'Bearer user-access-token' },
        }),
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    );
  });

  it('creates a separate client for every token', () => {
    const factory = createUserDataClientFactory({
      supabaseUrl: 'https://test-project.supabase.co',
      publishableKey: 'sb_publishable_test_key_value',
    });

    factory('token-a');
    factory('token-b');

    expect(createClient).toHaveBeenCalledTimes(2);
  });
});
