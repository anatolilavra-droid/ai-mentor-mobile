import { z } from 'zod';

import { USAGE_FEATURES } from './constants.js';

/** Every error code the API can return. HTTP statuses live in the API. */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'PROFILE_NOT_FOUND',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'RATE_LIMITED',
  'USAGE_LIMIT_REACHED',
  'INTERNAL_ERROR',
  'AI_PROVIDER_ERROR',
  'AI_INVALID_RESPONSE',
  /** The AI provider is overloaded or rate-limited right now; try again in a minute. */
  'AI_PROVIDER_BUSY',
  'SERVICE_UNAVAILABLE',
  'TIMEOUT',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const quotaDetailSchema = z
  .object({
    feature: z.enum(USAGE_FEATURES),
    used: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative(),
    resetsAt: z.string(),
  })
  .strict();
export type QuotaDetail = z.infer<typeof quotaDetailSchema>;

export const errorDetailSchema = z.object({ path: z.string(), message: z.string() });
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

/** The single error format of every API response. */
export const errorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum(ERROR_CODES),
        message: z.string(),
        requestId: z.string(),
        details: z.array(errorDetailSchema).optional(),
        quota: quotaDetailSchema.optional(),
      })
      .strict(),
  })
  .strict();
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
