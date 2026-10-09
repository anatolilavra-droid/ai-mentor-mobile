import { Router, type RequestHandler } from 'express';

import { createMeHandler } from '../controllers/me.controller.js';
import { defineRoute } from '../lib/defineRoute.js';
import { emptyQuerySchema } from '../schemas/common.schema.js';
import { meResponseSchema } from '../schemas/me.schema.js';
import type { ProfileService } from '../services/profile.service.js';

export function meRoutes(deps: { auth: RequestHandler; profileService: ProfileService }): Router {
  const router = Router();
  defineRoute(router, {
    method: 'get',
    path: '/api/me',
    middleware: [deps.auth],
    // No user id is accepted from the client: the profile always belongs to the token.
    query: emptyQuerySchema,
    response: meResponseSchema,
    handler: createMeHandler(deps.profileService),
  });
  return router;
}
