import type { RequestHandler } from 'express';
import type { z } from 'zod';

import { AppError, type ErrorDetail } from '../errors/AppError.js';

export function toErrorDetails(error: z.ZodError): ErrorDetail[] {
  return error.issues.slice(0, 20).map((issue) => ({
    path: issue.path.map(String).join('.') || '(root)',
    message: issue.message,
  }));
}

/** POST bodies must be JSON; anything else is 415. */
export const requireJson: RequestHandler = (req, _res, next) => {
  if (!req.is('application/json')) throw new AppError('UNSUPPORTED_MEDIA_TYPE');
  next();
};

/** Validates body and query with Zod. The parsed body replaces `req.body`. */
export function validate(schemas: { body?: z.ZodType; query?: z.ZodType }): RequestHandler {
  return (req, _res, next) => {
    if (schemas.query) {
      const query = schemas.query.safeParse(req.query);
      if (!query.success) {
        throw new AppError('VALIDATION_ERROR', { details: toErrorDetails(query.error) });
      }
    }
    if (schemas.body) {
      const body = schemas.body.safeParse(req.body);
      if (!body.success) {
        throw new AppError('VALIDATION_ERROR', { details: toErrorDetails(body.error) });
      }
      req.body = body.data;
    }
    next();
  };
}
