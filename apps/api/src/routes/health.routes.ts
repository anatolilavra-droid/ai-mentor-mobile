import { Router } from 'express';

import { createHealthHandler } from '../controllers/health.controller.js';
import { defineRoute } from '../lib/defineRoute.js';
import { emptyQuerySchema } from '../schemas/common.schema.js';
import { healthResponseSchema } from '../schemas/health.schema.js';

export function healthRoutes(version: string): Router {
  const router = Router();
  router.use('/health', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  defineRoute(router, {
    method: 'get',
    path: '/health',
    query: emptyQuerySchema,
    response: healthResponseSchema,
    handler: createHealthHandler(version),
  });
  return router;
}
