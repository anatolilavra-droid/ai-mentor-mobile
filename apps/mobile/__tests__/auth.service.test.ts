import { AuthApiError } from '@supabase/supabase-js';

import { AuthActionError } from '@/features/auth/auth.errors';
import {
  signIn,
  signOut,
  signUp,
  updatePassword,
  verifyRecoveryCode,
} from '@/features/auth/auth.service';

import { testSession } from './fixtures';

type FakeSupabase = typeof import('@/lib/supabase/__mocks__/client');
const { supabase } = jest.requireMock('@/lib/supabase/client') as FakeSupabase;

describe('auth service', () => {
  it('signs in with email and password', async () => {
    await signIn('anatoliy@example.com', 'mentor2026');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'anatoliy@example.com',
      password: 'mentor2026',
    });
  });

  it('turns a rejected sign in into a safe error', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
    } as never);
    await expect(signIn('a@example.com', 'wrong')).rejects.toMatchObject({
      messageKey: 'auth.errors.invalidCredentials',
    });
  });

  it('reports when sign up needs email confirmation', async () => {
    await expect(signUp('a@example.com', 'mentor2026', 'ru')).resolves.toEqual({
      needsEmailConfirmation: true,
    });
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@example.com',
        options: expect.objectContaining({ data: { ui_language: 'ru' } }),
      }),
    );
  });

  it('reports a signed-in sign up when confirmation is off', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { session: testSession, user: testSession.user },
      error: null,
    } as never);
    await expect(signUp('a@example.com', 'mentor2026', 'en')).resolves.toEqual({
      needsEmailConfirmation: false,
    });
  });

  it('falls back to a local sign out when the server is unreachable', async () => {
    supabase.auth.signOut
      .mockResolvedValueOnce({ error: new Error('network') } as never)
      .mockResolvedValueOnce({ error: null } as never);
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
  });

  it('verifies a recovery code and updates the password in separate steps', async () => {
    await verifyRecoveryCode('a@example.com', '123456');
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'a@example.com',
      token: '123456',
      type: 'recovery',
    });
    await updatePassword('mentor2027');
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'mentor2027' });
  });

  it('rejects an expired recovery code with a clear error', async () => {
    supabase.auth.verifyOtp.mockResolvedValueOnce({
      data: {},
      error: new AuthApiError('Token has expired', 403, 'otp_expired'),
    } as never);
    const error = await verifyRecoveryCode('a@example.com', '000000').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthActionError);
    expect((error as AuthActionError).messageKey).toBe('auth.errors.codeInvalid');
  });
});
