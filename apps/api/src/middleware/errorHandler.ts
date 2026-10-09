import type { ErrorRequestHandler, Response } from 'express';

import { AppError, isAppError } from '../errors/AppError.js';
import type { ErrorResponse } from '../schemas/error.schema.js';

import { getRequestId } from './requestId.js';

/** body-parser marks its errors with a `type`. Map them to API codes. */
function fromBodyParser(error: unknown): AppError | null {
  if (typeof error !== 'object' || error === null || !('type' in error)) return null;
  switch (error.type) {
    case 'entity.too.large':
      return new AppError('PAYLOAD_TOO_LARGE');
    case 'entity.parse.failed':
      return new AppError('VALIDATION_ERROR', { message: 'The request body is not valid JSON.' });
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return new AppError('UNSUPPORTED_MEDIA_TYPE');
    default:
      return null;
  }
}

export function sendError(res: Response, error: AppError, requestId: string): void {
  const body: ErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      requestId,
      ...(error.details ? { details: error.details } : {}),
      ...(error.quota ? { quota: error.quota } : {}),
    },
  };
  res.status(error.status).json(body);
}

/**
 * The single place that turns errors into responses. Clients get a stable code
 * and a safe message; stacks and causes go to the server log only.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  const appError = isAppError(error)
    ? error
    : (fromBodyParser(error) ?? new AppError('INTERNAL_ERROR', { cause: error }));

  // The response already went out (timeout) or the client left: nothing more to send.
  if (res.headersSent || res.destroyed) {
    req.log.debug({ code: appError.code }, 'error after the response ended');
    return;
  }

  if (appError.status >= 500) {
    req.log.error({ err: error, code: appError.code }, 'request error');
  } else {
    req.log.debug({ code: appError.code }, 'request rejected');
  }

  if (appError.code === 'RATE_LIMITED' && !res.getHeader('Retry-After')) {
    res.setHeader('Retry-After', '60');
  }
  sendError(res, appError, getRequestId(req));
};
