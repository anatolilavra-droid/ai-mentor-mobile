import type { ErrorCode, ErrorDetail, QuotaDetail } from '@ai-mentor/shared';

import type { TranslationKey } from '@/lib/i18n';

/**
 * API error codes plus the failures that happen before or around a response.
 * CANCELLED: the caller aborted the request on purpose (no message is shown).
 */
export type ApiErrorCode =
  ErrorCode | 'NOT_CONFIGURED' | 'NETWORK' | 'CLIENT_TIMEOUT' | 'BAD_RESPONSE' | 'CANCELLED';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  readonly requestId: string | null;
  readonly quota: QuotaDetail | null;
  /** Validation details (field path and a stable message key). */
  readonly details: readonly ErrorDetail[];

  constructor(
    code: ApiErrorCode,
    options: {
      status?: number;
      requestId?: string;
      quota?: QuotaDetail;
      details?: readonly ErrorDetail[];
      cause?: unknown;
    } = {},
  ) {
    super(code, { cause: options.cause });
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status ?? null;
    this.requestId = options.requestId ?? null;
    this.quota = options.quota ?? null;
    this.details = options.details ?? [];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** A calm, translated message for every failure. Never shows server details. */
export function apiErrorMessageKey(error: unknown): TranslationKey {
  if (!isApiError(error)) return 'chat.errors.generic';
  switch (error.code) {
    case 'NOT_CONFIGURED':
      return 'chat.errors.notConfigured';
    case 'NETWORK':
      return 'chat.errors.network';
    case 'CLIENT_TIMEOUT':
    case 'TIMEOUT':
      return 'chat.errors.timeout';
    case 'UNAUTHORIZED':
      return 'chat.errors.unauthorized';
    case 'RATE_LIMITED':
      return 'chat.errors.rateLimited';
    case 'USAGE_LIMIT_REACHED':
      return 'chat.errors.limitReached';
    case 'VALIDATION_ERROR':
    case 'PAYLOAD_TOO_LARGE':
      return 'chat.errors.invalid';
    case 'AI_PROVIDER_ERROR':
    case 'AI_INVALID_RESPONSE':
    case 'SERVICE_UNAVAILABLE':
      return 'chat.errors.unavailable';
    default:
      return 'chat.errors.generic';
  }
}

/** Failures worth a Retry button (temporary by nature). */
export function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return true;
  return ![
    'CANCELLED',
    'NOT_CONFIGURED',
    'USAGE_LIMIT_REACHED',
    'VALIDATION_ERROR',
    'PAYLOAD_TOO_LARGE',
  ].includes(error.code);
}
