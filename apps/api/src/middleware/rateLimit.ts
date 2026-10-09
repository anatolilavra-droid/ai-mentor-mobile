import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

import { AppError } from '../errors/AppError.js';

type LimitOptions = { max: number; windowMs: number };

const rejectWithAppError: RequestHandler = (_req, _res, next) => {
  next(new AppError('RATE_LIMITED'));
};

/**
 * Generous per-IP limit for every route. Mobile carriers put many users behind
 * one IP (CGNAT), so the strict limits are per user, not per IP.
 */
export function createIpLimiter({ max, windowMs }: LimitOptions): RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rejectWithAppError,
  });
}

/** Per-user limit for AI routes. Must run after requireAuth. */
export function createAiUserLimiter({ max, windowMs }: LimitOptions): RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    identifier: 'ai',
    keyGenerator: (req) => {
      if (!req.auth) throw new AppError('UNAUTHORIZED');
      return `user:${req.auth.userId}`;
    },
    handler: rejectWithAppError,
  });
}
