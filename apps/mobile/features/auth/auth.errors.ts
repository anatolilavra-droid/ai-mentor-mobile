import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

import type { TranslationKey } from '@/lib/i18n';

const byCode: Record<string, TranslationKey> = {
  invalid_credentials: 'auth.errors.invalidCredentials',
  email_not_confirmed: 'auth.errors.emailNotConfirmed',
  user_already_exists: 'auth.errors.emailTaken',
  email_exists: 'auth.errors.emailTaken',
  weak_password: 'auth.errors.weakPassword',
  same_password: 'auth.errors.samePassword',
  email_address_invalid: 'auth.errors.emailInvalid',
  otp_expired: 'auth.errors.codeInvalid',
  over_email_send_rate_limit: 'auth.errors.emailRateLimit',
  over_request_rate_limit: 'auth.errors.tooManyRequests',
  signup_disabled: 'auth.errors.signupDisabled',
};

/** A failed auth action, carrying a safe, translatable message. Never exposes raw server text. */
export class AuthActionError extends Error {
  readonly messageKey: TranslationKey;

  constructor(messageKey: TranslationKey, options?: { cause?: unknown }) {
    super(messageKey, options);
    this.name = 'AuthActionError';
    this.messageKey = messageKey;
  }
}

export function toAuthActionError(error: unknown): AuthActionError {
  if (error instanceof AuthActionError) return error;
  if (isAuthRetryableFetchError(error)) {
    return new AuthActionError('auth.errors.network', { cause: error });
  }
  if (isAuthError(error) && error.code && byCode[error.code]) {
    return new AuthActionError(byCode[error.code] as TranslationKey, { cause: error });
  }
  if (error instanceof TypeError && /network|fetch/i.test(error.message)) {
    return new AuthActionError('auth.errors.network', { cause: error });
  }
  return new AuthActionError('auth.errors.unknown', { cause: error });
}
