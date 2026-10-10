import { AppError } from '../../errors/AppError.js';

import { AIProviderError } from './providers/AIProvider.js';

/**
 * Turns a failed provider call into a safe API error. Provider messages stay in
 * the `cause` (server logs only).
 */
export function toAppError(
  error: unknown,
  signals: { request: AbortSignal; timeout: AbortSignal },
): AppError {
  if (signals.request.aborted && signals.request.reason instanceof AppError) {
    return signals.request.reason;
  }
  if (signals.timeout.aborted) return new AppError('TIMEOUT', { cause: error });
  if (error instanceof AppError) return error;
  if (error instanceof AIProviderError) {
    switch (error.kind) {
      case 'timeout':
        return new AppError('TIMEOUT', { cause: error });
      case 'rate_limited':
      case 'overloaded':
        return new AppError('AI_PROVIDER_BUSY', { cause: error });
      case 'invalid_response':
        return new AppError('AI_INVALID_RESPONSE', { cause: error });
      default:
        return new AppError('AI_PROVIDER_ERROR', { cause: error });
    }
  }
  return new AppError('AI_PROVIDER_ERROR', { cause: error });
}
