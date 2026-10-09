import { DEFAULT_MESSAGES, ERROR_STATUS, type ErrorCode } from './codes.js';

export type ErrorDetail = { path: string; message: string };

/**
 * An error with a stable code and a safe message. `cause` is logged on the
 * server and never sent to the client.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: ErrorDetail[] | undefined;

  constructor(
    code: ErrorCode,
    options: { message?: string; details?: ErrorDetail[]; cause?: unknown } = {},
  ) {
    super(options.message ?? DEFAULT_MESSAGES[code], { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = options.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
