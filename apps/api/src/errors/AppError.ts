import type { ErrorDetail, PlanLimitDetail, QuotaDetail } from '@ai-mentor/shared';

import { DEFAULT_MESSAGES, ERROR_STATUS, type ErrorCode } from './codes.js';

export type { ErrorDetail, PlanLimitDetail, QuotaDetail };

/**
 * An error with a stable code and a safe message. `cause` is logged on the
 * server and never sent to the client.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: ErrorDetail[] | undefined;
  readonly quota: QuotaDetail | undefined;
  readonly planLimit: PlanLimitDetail | undefined;

  constructor(
    code: ErrorCode,
    options: {
      message?: string;
      details?: ErrorDetail[];
      quota?: QuotaDetail;
      planLimit?: PlanLimitDetail;
      cause?: unknown;
    } = {},
  ) {
    super(options.message ?? DEFAULT_MESSAGES[code], { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = options.details;
    this.quota = options.quota;
    this.planLimit = options.planLimit;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
