import { CHAT_HISTORY_DEFAULTS } from '@ai-mentor/shared';

import { createApp, type AppConfig, type AppDeps } from '../../src/app.js';
import { createJwksVerifier } from '../../src/auth/jwksVerifier.js';
import { createLogger } from '../../src/lib/logger.js';
import { createMockProvider } from '../../src/services/ai/providers/mock.provider.js';

import { captureLogs } from './captureLogs.js';
import { createFakeSupabase, type FakeSupabaseOptions } from './fakeSupabase.js';
import { jwksFetch, TEST_SUPABASE_URL } from './keys.js';

export const testConfig: AppConfig = {
  version: '0.0.0-test',
  aiTimeoutMs: 2_000,
  codeReviewAiTimeoutMs: 2_000,
  requestTimeoutMs: 3_000,
  jsonBodyLimit: '64kb',
  rateLimitIp: { max: 1_000, windowMs: 60_000 },
  rateLimitAi: { max: 1_000, windowMs: 60_000 },
  trustProxy: 0,
  realAiUserIds: [],
  historyLimits: CHAT_HISTORY_DEFAULTS,
};

type Overrides = Partial<Omit<AppDeps, 'config' | 'logger'>> & {
  config?: Partial<AppConfig>;
  supabase?: FakeSupabaseOptions;
};

/** The real app with in-memory dependencies: local JWKS, fake Supabase (with usage), mock AI. */
export function buildTestApp(overrides: Overrides = {}) {
  const logs = captureLogs();
  const supabase = createFakeSupabase(overrides.supabase);
  const app = createApp({
    config: { ...testConfig, ...overrides.config },
    logger: createLogger({ level: 'debug', destination: logs.destination }),
    tokenVerifier:
      overrides.tokenVerifier ??
      createJwksVerifier({ supabaseUrl: TEST_SUPABASE_URL, fetchImpl: jwksFetch }),
    createUserClient: overrides.createUserClient ?? supabase.factory,
    aiProvider: overrides.aiProvider ?? createMockProvider(),
    ...(overrides.usageGuard ? { usageGuard: overrides.usageGuard } : {}),
  });
  return { app, logs, supabase };
}
