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
import { aiRoutes, healthRoutes, meRoutes, usageRoutes } from './routes/index.js';
import { createAIService } from './services/ai/ai.service.js';
import type { AIProvider } from './services/ai/providers/AIProvider.js';
import { createMockProvider } from './services/ai/providers/mock.provider.js';
import { createProviderSelector } from './services/ai/providers/selectProvider.js';
import { createProfileService } from './services/profile.service.js';
import { createSupabaseUsage } from './services/usage/supabaseUsage.js';
import type { UsageGuard } from './services/usage/UsageGuard.js';

export type AppConfig = {
  version: string;
  aiTimeoutMs: number;
  requestTimeoutMs: number;
  jsonBodyLimit: string;
  rateLimitIp: { max: number; windowMs: number };
  rateLimitAi: { max: number; windowMs: number };
  trustProxy: number;
  /**
   * Users who may reach a real AI provider. Everyone else gets the mock, so
   * nobody else's data reaches a free-tier provider. Ignored for the mock provider.
   */
  realAiUserIds: readonly string[];
};

export type AppDeps = {
  config: AppConfig;
  logger: Logger;
  tokenVerifier: TokenVerifier;
  createUserClient: UserDataClientFactory;
  aiProvider: AIProvider;
  /** Tests may replace the database-backed guard. */
  usageGuard?: UsageGuard;
};

/** Builds the Express app. Every dependency is injected, so tests need no network. */
export function createApp(deps: AppDeps): Express {
  const { config } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  const profileService = createProfileService(deps.createUserClient);
  const usage = createSupabaseUsage(deps.createUserClient);
  const aiService = createAIService({
    selectProvider: createProviderSelector({
      provider: deps.aiProvider,
      fallback: createMockProvider(),
      allowedUserIds: config.realAiUserIds,
    }),
    usageGuard: deps.usageGuard ?? usage.guard,
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
  app.use(usageRoutes({ auth, usage }));
  app.use(aiRoutes({ auth, aiUserLimiter: createAiUserLimiter(config.rateLimitAi), aiService }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
