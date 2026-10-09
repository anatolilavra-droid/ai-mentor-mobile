import { z } from 'zod';

const intFromEnv = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: intFromEnv(1, 65535).default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    SUPABASE_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, '')),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(20),

    AI_PROVIDER: z.enum(['mock']).default('mock'),
    AI_TIMEOUT_MS: intFromEnv(1, 120_000).default(30_000),
    REQUEST_TIMEOUT_MS: intFromEnv(1, 180_000).default(40_000),

    JSON_BODY_LIMIT: z
      .string()
      .regex(/^\d{1,4}kb$/)
      .default('64kb'),
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
