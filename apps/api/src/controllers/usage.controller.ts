import type { Request } from 'express';

import { AppError } from '../errors/AppError.js';
import type { SubscriptionResponse, UsageResponse } from '../schemas/usage.schema.js';
import type { SupabaseUsage } from '../services/usage/supabaseUsage.js';
import type { UsageCaller } from '../services/usage/UsageGuard.js';

function toCaller(req: Request): UsageCaller {
  if (!req.auth) throw new AppError('UNAUTHORIZED');
  return { userId: req.auth.userId, accessToken: req.auth.accessToken, signal: req.abortSignal };
}

export function createUsageHandler(usage: SupabaseUsage) {
  return async ({ req }: { req: Request }): Promise<UsageResponse> => usage.getUsage(toCaller(req));
}

export function createSubscriptionHandler(usage: SupabaseUsage) {
  return async ({ req }: { req: Request }): Promise<SubscriptionResponse> =>
    usage.getSubscription(toCaller(req));
}
