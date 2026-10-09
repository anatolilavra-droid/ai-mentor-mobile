import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url({ message: 'EXPO_PUBLIC_SUPABASE_URL must be a valid URL' }),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20, { message: 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing' }),
});

export type Env = z.infer<typeof envSchema>;

export type EnvResult = { ok: true; env: Env } | { ok: false; missing: string[] };

/**
 * Public build-time configuration. Expo inlines `process.env.EXPO_PUBLIC_*`
 * only for static property access, so each variable is read explicitly.
 */
export function readEnv(): EnvResult {
  const parsed = envSchema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (parsed.success) return { ok: true, env: parsed.data };
  return {
    ok: false,
    missing: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
  };
}

export const envResult = readEnv();
