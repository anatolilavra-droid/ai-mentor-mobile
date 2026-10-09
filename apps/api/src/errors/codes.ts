import type { ErrorCode } from '@ai-mentor/shared';

export type { ErrorCode };

/** The HTTP status of every error code (server-only; the codes live in @ai-mentor/shared). */
export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PROFILE_NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  USAGE_LIMIT_REACHED: 429,
  INTERNAL_ERROR: 500,
  AI_PROVIDER_ERROR: 502,
  AI_INVALID_RESPONSE: 502,
  SERVICE_UNAVAILABLE: 503,
  TIMEOUT: 504,
} as const satisfies Record<ErrorCode, number>;

/** Safe, user-facing default messages. Never include internal details here. */
export const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'The request is invalid.',
  UNAUTHORIZED: 'Authentication is required.',
  FORBIDDEN: 'You do not have access to this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  PROFILE_NOT_FOUND: 'Your profile was not found.',
  PAYLOAD_TOO_LARGE: 'The request is too large.',
  UNSUPPORTED_MEDIA_TYPE: 'The request must be JSON.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  USAGE_LIMIT_REACHED: 'You have reached your usage limit.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
  AI_PROVIDER_ERROR: 'The AI mentor is unavailable right now. Please try again.',
  AI_INVALID_RESPONSE: 'The AI mentor returned an unexpected answer. Please try again.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again.',
  TIMEOUT: 'The request took too long. Please try again.',
};
