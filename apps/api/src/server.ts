import { readFileSync } from 'node:fs';

import { z } from 'zod';

import { createApp } from './app.js';
import { createJwksVerifier } from './auth/jwksVerifier.js';
import { parseEnv } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { createUserDataClientFactory } from './lib/supabase.js';
import { createAIProvider } from './services/ai/providers/index.js';

const SHUTDOWN_GRACE_MS = 10_000;

const envResult = parseEnv(process.env);
if (!envResult.ok) {
  // Names and rules only, never values.
  process.stderr.write(`Invalid API environment:\n- ${envResult.problems.join('\n- ')}\n`);
  process.exit(1);
}
const env = envResult.env;

const { version } = z
  .object({ version: z.string() })
  .parse(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')));

const logger = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV === 'development' });

const app = createApp({
  config: {
    version,
    aiTimeoutMs: env.AI_TIMEOUT_MS,
    codeReviewAiTimeoutMs: env.CODE_REVIEW_AI_TIMEOUT_MS,
    requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
    jsonBodyLimit: env.JSON_BODY_LIMIT,
    rateLimitIp: { max: env.RATE_LIMIT_IP_MAX, windowMs: env.RATE_LIMIT_IP_WINDOW_MS },
    rateLimitAi: { max: env.RATE_LIMIT_AI_MAX, windowMs: env.RATE_LIMIT_AI_WINDOW_MS },
    trustProxy: env.TRUST_PROXY,
    realAiUserIds: env.AI_REAL_PROVIDER_USER_IDS,
    historyLimits: {
      maxMessages: env.CHAT_HISTORY_MAX_MESSAGES,
      maxChars: env.CHAT_CONTEXT_MAX_CHARS,
      perMessageMax: env.CHAT_HISTORY_MESSAGE_MAX_CHARS,
    },
  },
  logger,
  tokenVerifier: createJwksVerifier({ supabaseUrl: env.SUPABASE_URL }),
  createUserClient: createUserDataClientFactory({
    supabaseUrl: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
  }),
  aiProvider: createAIProvider(
    env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY && env.AI_MODEL
      ? { provider: 'gemini', apiKey: env.GEMINI_API_KEY, model: env.AI_MODEL }
      : { provider: 'mock' },
  ),
});

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(
    {
      host: env.HOST,
      port: env.PORT,
      version,
      aiProvider: env.AI_PROVIDER,
      aiModel: env.AI_MODEL,
      realAiUsers: env.AI_REAL_PROVIDER_USER_IDS.length,
    },
    'api listening',
  );
  if (env.AI_PROVIDER !== 'mock' && env.AI_REAL_PROVIDER_USER_IDS.length === 0) {
    logger.warn('AI_REAL_PROVIDER_USER_IDS is empty: every user gets the mock provider');
  }
});
server.headersTimeout = 15_000;
server.requestTimeout = 60_000;
server.keepAliveTimeout = 65_000;

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
