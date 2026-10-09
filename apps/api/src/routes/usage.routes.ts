import { Router, type RequestHandler } from 'express';

import { createSubscriptionHandler, createUsageHandler } from '../controllers/usage.controller.js';
import { defineRoute } from '../lib/defineRoute.js';
import { emptyQuerySchema } from '../schemas/common.schema.js';
import { subscriptionResponseSchema, usageResponseSchema } from '@ai-mentor/shared';
import type { SupabaseUsage } from '../services/usage/supabaseUsage.js';

/** The caller's own plan and usage. No user id is accepted from the client. */
export function usageRoutes(deps: { auth: RequestHandler; usage: SupabaseUsage }): Router {
  const router = Router();
  defineRoute(router, {
    method: 'get',
    path: '/api/usage',
    middleware: [deps.auth],
    query: emptyQuerySchema,
    response: usageResponseSchema,
    handler: createUsageHandler(deps.usage),
  });
  defineRoute(router, {
    method: 'get',
    path: '/api/subscription',
    middleware: [deps.auth],
    query: emptyQuerySchema,
    response: subscriptionResponseSchema,
    handler: createSubscriptionHandler(deps.usage),
  });
  return router;
}
