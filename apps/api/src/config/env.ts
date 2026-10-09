import { z } from 'zod';

const intFromEnv = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: intFromEnv(1, 65535).default(3000),
    /** Interface to listen on. 0.0.0.0 so the platform's router can reach the server. */
    HOST: z
      .string()
      .regex(/^[a-z0-9.:-]{1,64}$/i)
      .default('0.0.0.0'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    SUPABASE_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, '')),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(20),

    AI_PROVIDER: z.enum(['mock', 'gemini']).default('mock'),
    GEMINI_API_KEY: z.string().min(20).optional(),
    /** Exact model id from Google AI Studio, e.g. a Flash model. Never guessed in code. */
    AI_MODEL: z
      .string()
      .regex(/^[a-z0-9][a-z0-9.-]{2,63}$/)
      .optional(),
    /** Comma-separated user ids allowed to reach a real provider; everyone else gets the mock. */
    AI_REAL_PROVIDER_USER_IDS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.uuid()).max(20)),
    AI_TIMEOUT_MS: intFromEnv(1, 120_000).default(30_000),
    REQUEST_TIMEOUT_MS: intFromEnv(1, 180_000).default(40_000),

    /** Fits a 10 000-character message plus the largest allowed history. */
    JSON_BODY_LIMIT: z
      .string()
      .regex(/^\d{1,4}kb$/)
      .default('256kb'),
    /** Conversation history sent to the AI: last N messages within a character budget. */
    CHAT_HISTORY_MAX_MESSAGES: intFromEnv(0, 40).default(12),
    CHAT_CONTEXT_MAX_CHARS: intFromEnv(0, 60_000).default(24_000),
    CHAT_HISTORY_MESSAGE_MAX_CHARS: intFromEnv(200, 40_000).default(4_000),
    RATE_LIMIT_IP_MAX: intFromEnv(1, 100_000).default(300),
    RATE_LIMIT_IP_WINDOW_MS: intFromEnv(1_000, 86_400_000).default(300_000),
    RATE_LIMIT_AI_MAX: intFromEnv(1, 10_000).default(10),
    RATE_LIMIT_AI_WINDOW_MS: intFromEnv(1_000, 86_400_000).default(60_000),

    TRUST_PROXY: intFromEnv(0, 10).default(0),
  })
  .superRefine((env, ctx) => {
    if (env.REQUEST_TIMEOUT_MS <= env.AI_TIMEOUT_MS) {
      ctx.addIssue({
        code: 'custom',
        path: ['REQUEST_TIMEOUT_MS'],
        message: 'must be greater than AI_TIMEOUT_MS',
      });
    }
    if (env.AI_PROVIDER === 'gemini') {
      if (!env.GEMINI_API_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['GEMINI_API_KEY'],
          message: 'is required for gemini',
        });
      }
      if (!env.AI_MODEL) {
        ctx.addIssue({ code: 'custom', path: ['AI_MODEL'], message: 'is required for gemini' });
      }
    }
    if (env.NODE_ENV === 'production' && env.AI_PROVIDER === 'mock') {
      ctx.addIssue({
        code: 'custom',
        path: ['AI_PROVIDER'],
        message: 'the mock provider must not run in production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export type EnvResult = { ok: true; env: Env } | { ok: false; problems: string[] };

/**
 * Parses the server environment. Problems name the variable and the rule only,
 * never the value, so secrets cannot end up in logs.
 */
export function parseEnv(source: Record<string, string | undefined>): EnvResult {
  const leakedPublicVars = Object.keys(source).filter((key) => key.startsWith('EXPO_PUBLIC_'));
  if (leakedPublicVars.length > 0) {
    return {
      ok: false,
      problems: leakedPublicVars.map((key) => `${key}: mobile variables do not belong in the API`),
    };
  }

  const parsed = envSchema.safeParse(source);
  if (parsed.success) return { ok: true, env: parsed.data };
  return {
    ok: false,
    problems: parsed.error.issues.map((issue) => {
      const name = String(issue.path[0] ?? 'env');
      return issue.code === 'custom' ? `${name}: ${issue.message}` : `${name}: missing or invalid`;
    }),
  };
}
