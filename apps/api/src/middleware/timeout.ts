import type { RequestHandler } from 'express';

import { AppError } from '../errors/AppError.js';

import { abortRequest } from './requestContext.js';

/**
 * Ends a request with 504 TIMEOUT after `timeoutMs` and aborts its work.
 * Must run after requestContext.
 */
export function requestTimeout(timeoutMs: number): RequestHandler {
  return (_req, res, next) => {
    const timer = setTimeout(() => {
      const error = new AppError('TIMEOUT');
      abortRequest(res, error);
      if (!res.headersSent) next(error);
    }, timeoutMs);
    timer.unref();
    const clear = () => clearTimeout(timer);
    res.on('finish', clear);
    res.on('close', clear);
    next();
  };
}
