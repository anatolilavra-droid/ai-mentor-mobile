import { Router, type RequestHandler } from 'express';

import {
  createChatHandler,
  createCodeReviewHandler,
  createLearningPlanHandler,
} from '../controllers/ai.controller.js';
import { defineRoute } from '../lib/defineRoute.js';
import {
  chatRequestSchema,
  chatResponseSchema,
  codeReviewRequestSchema,
  codeReviewResponseSchema,
  learningPlanRequestSchema,
  learningPlanResponseSchema,
} from '@ai-mentor/shared';
import { emptyQuerySchema } from '../schemas/common.schema.js';
import type { AIService } from '../services/ai/ai.service.js';

export function aiRoutes(deps: {
  auth: RequestHandler;
  aiUserLimiter: RequestHandler;
  aiService: AIService;
}): Router {
  const router = Router();
  defineRoute(router, {
    method: 'post',
    path: '/api/ai/chat',
    // Auth first (the limiter keys on the user), then the limiter, then validation.
    middleware: [deps.auth, deps.aiUserLimiter],
    query: emptyQuerySchema,
    body: chatRequestSchema,
    response: chatResponseSchema,
    handler: createChatHandler(deps.aiService),
  });
  defineRoute(router, {
    method: 'post',
    path: '/api/ai/code-review',
    middleware: [deps.auth, deps.aiUserLimiter],
    query: emptyQuerySchema,
    body: codeReviewRequestSchema,
    response: codeReviewResponseSchema,
    handler: createCodeReviewHandler(deps.aiService),
  });
  defineRoute(router, {
    method: 'post',
    path: '/api/ai/learning-plan',
    // The user comes from the verified token only; the body never names a user.
    middleware: [deps.auth, deps.aiUserLimiter],
    query: emptyQuerySchema,
    body: learningPlanRequestSchema,
    response: learningPlanResponseSchema,
    handler: createLearningPlanHandler(deps.aiService),
  });
  return router;
}
