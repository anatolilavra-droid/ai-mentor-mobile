import { decodeJwt } from 'jose';

import type { UserDataClient, UserDataClientFactory } from '../../src/lib/supabase.js';

import { USER_A, USER_B } from './tokens.js';

export type FakeProfileRow = Record<string, unknown> & { id: string };

export function profileRow(id: string, overrides: Record<string, unknown> = {}): FakeProfileRow {
  return {
    id,
    display_name: id === USER_A ? 'Alice' : 'Bob',
    experience_level: 'beginner',
    primary_goal: 'learn_javascript',
    daily_minutes: 30,
    ui_language: 'en',
    onboarding_completed: true,
    ...overrides,
  };
}

export type FakeSupabaseOptions = {
  rows?: FakeProfileRow[];
  /** Simulates a PostgREST or network failure. */
  failure?: { status: number; message: string };
  delayMs?: number;
};

/**
 * A Supabase stand-in that emulates the `profiles: read own` RLS policy: a
 * client only ever sees rows whose id equals the `sub` of the token it was
 * created with, whatever filter the query uses.
 */
export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const rows = options.rows ?? [profileRow(USER_A), profileRow(USER_B)];
  const accessTokens: string[] = [];
  const filters: { column: string; value: unknown }[] = [];

  const factory: UserDataClientFactory = (accessToken) => {
    accessTokens.push(accessToken);
    const sub = decodeJwt(accessToken).sub;
    const visible = rows.filter((row) => row.id === sub);

    const query = {
      filtered: visible,
      select: () => query,
      eq: (column: string, value: unknown) => {
        filters.push({ column, value });
        query.filtered = query.filtered.filter((row) => row[column] === value);
        return query;
      },
      abortSignal: () => query,
      maybeSingle: async () => {
        if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
        if (options.failure) {
          return {
            data: null,
            error: { message: options.failure.message },
            status: options.failure.status,
          };
        }
        return { data: query.filtered[0] ?? null, error: null, status: 200 };
      },
    };
    return { from: () => query } as unknown as UserDataClient;
  };

  return { factory, accessTokens, filters };
}
