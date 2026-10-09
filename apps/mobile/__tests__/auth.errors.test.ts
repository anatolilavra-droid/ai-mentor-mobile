import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { toAuthActionError } from '@/features/auth/auth.errors';

describe('toAuthActionError', () => {
  it.each([
    ['invalid_credentials', 'auth.errors.invalidCredentials'],
    ['email_not_confirmed', 'auth.errors.emailNotConfirmed'],
    ['user_already_exists', 'auth.errors.emailTaken'],
    ['weak_password', 'auth.errors.weakPassword'],
    ['otp_expired', 'auth.errors.codeInvalid'],
    ['over_email_send_rate_limit', 'auth.errors.emailRateLimit'],
    ['same_password', 'auth.errors.samePassword'],
  ])('maps %s to a safe message', (code, key) => {
    expect(toAuthActionError(new AuthApiError('server text', 400, code)).messageKey).toBe(key);
  });

  it('maps network failures', () => {
    expect(toAuthActionError(new AuthRetryableFetchError('Failed to fetch', 0)).messageKey).toBe(
      'auth.errors.network',
    );
  });

  it('never exposes unknown server text', () => {
    const error = toAuthActionError(
      new AuthApiError('Database error: secret detail', 500, 'unexpected_failure'),
    );
    expect(error.messageKey).toBe('auth.errors.unknown');
    expect(error.message).not.toContain('secret');
  });
});
