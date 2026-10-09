import type { RequestHandler, Response } from 'express';

import { AppError } from '../errors/AppError.js';

const CONTROLLER_KEY = 'abortController';

/**
 * Gives every request an AbortSignal (`req.abortSignal`). It aborts when the
 * request times out or the client disconnects, so AI calls stop instead of
 * running (and costing) for nobody.
 */
export const requestContext: RequestHandler = (req, res, next) => {
  const controller = new AbortController();
  res.locals[CONTROLLER_KEY] = controller;
  req.abortSignal = controller.signal;
  res.on('close', () => {
    if (!res.writableFinished && !controller.signal.aborted) {
      controller.abort(new AppError('SERVICE_UNAVAILABLE', { message: 'Client disconnected.' }));
    }
  });
  next();
};

export function abortRequest(res: Response, reason: AppError): void {
  const controller: unknown = res.locals[CONTROLLER_KEY];
  if (controller instanceof AbortController && !controller.signal.aborted) {
    controller.abort(reason);
  }
}
