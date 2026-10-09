import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import type { TokenVerifier } from './auth/TokenVerifier.js';
import type { UserDataClientFactory } from './lib/supabase.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createHttpLogger } from './middleware/httpLogger.js';
import { notFound } from './middleware/notFound.js';
import { createAiUserLimiter, createIpLimiter } from './middleware/rateLimit.js';
import { requestContext } from './middleware/requestContext.js';
import { requestTimeout } from './middleware/timeout.js';
import { aiRoutes, healthRoutes, meRoutes } from './routes/index.js';
import { createAIService } from './services/ai/ai.service.js';
import type { AIProvider } from './services/ai/providers/AIProvider.js';
import { createProfileService } from './services/profile.service.js';
import type { UsageGuard } from './services/usage/UsageGuard.js';

export type AppConfig = {
  version: string;
  aiTimeoutMs: number;
  requestTimeoutMs: number;
  jsonBodyLimit: string;
  rateLimitIp: { max: number; windowMs: number };
  rateLimitAi: { max: number; windowMs: number };
  trustProxy: number;
};

export type AppDeps = {
  config: AppConfig;
  logger: Logger;
  tokenVerifier: TokenVerifier;
  createUserClient: UserDataClientFactory;
  aiProvider: AIProvider;
  usageGuard: UsageGuard;
};

/** Builds the Express app. Every dependency is injected, so tests need no network. */
export function createApp(deps: AppDeps): Express {
  const { config } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  const profileService = createProfileService(deps.createUserClient);
  const aiService = createAIService({
    provider: deps.aiProvider,
    usageGuard: deps.usageGuard,
    profileService,
    aiTimeoutMs: config.aiTimeoutMs,
  });
  const auth = requireAuth(deps.tokenVerifier);

  app.use(helmet());
  app.use(createHttpLogger(deps.logger));
  app.use(requestContext);
  app.use(requestTimeout(config.requestTimeoutMs));
  app.use(createIpLimiter(config.rateLimitIp));
  app.use(express.json({ limit: config.jsonBodyLimit, strict: true }));

  app.use(healthRoutes(config.version));
  app.use(meRoutes({ auth, profileService }));
  app.use(aiRoutes({ auth, aiUserLimiter: createAiUserLimiter(config.rateLimitAi), aiService }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
