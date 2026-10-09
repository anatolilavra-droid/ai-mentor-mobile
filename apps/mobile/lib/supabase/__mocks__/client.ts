/**
 * In-memory Supabase fake for Jest (auto-used via jest.mock in jest.setup.ts).
 * No test ever talks to a real server.
 */
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import type { ProfileRow, TechnologyRow } from '@/types/database';

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

const listeners = new Set<Listener>();

export const fakeTechnologies: TechnologyRow[] = [
  { id: 'javascript', name: 'JavaScript', category: 'language', sort_order: 10, is_active: true },
  { id: 'typescript', name: 'TypeScript', category: 'language', sort_order: 20, is_active: true },
  { id: 'python', name: 'Python', category: 'language', sort_order: 30, is_active: true },
  { id: 'html', name: 'HTML', category: 'language', sort_order: 40, is_active: true },
  { id: 'css', name: 'CSS', category: 'language', sort_order: 50, is_active: true },
  { id: 'sql', name: 'SQL', category: 'language', sort_order: 60, is_active: true },
  { id: 'react', name: 'React', category: 'frontend', sort_order: 10, is_active: true },
  {
    id: 'react-native',
    name: 'React Native',
    category: 'frontend',
    sort_order: 20,
    is_active: true,
  },
  { id: 'nextjs', name: 'Next.js', category: 'frontend', sort_order: 30, is_active: true },
  { id: 'nodejs', name: 'Node.js', category: 'backend', sort_order: 10, is_active: true },
  { id: 'git', name: 'Git', category: 'tools', sort_order: 10, is_active: true },
];

type FakeDb = {
  session: Session | null;
  profile: ProfileRow | null;
  profileError: Error | null;
  technologies: TechnologyRow[];
  technologiesError: Error | null;
  userTechnologies: string[];
  rpcError: { message: string } | null;
};

export const fakeDb: FakeDb = {
  session: null,
  profile: null,
  profileError: null,
  technologies: [...fakeTechnologies],
  technologiesError: null,
  userTechnologies: [],
  rpcError: null,
};

type Result = { data: unknown; error: unknown };

function resultFor(table: string, single: boolean): Promise<Result> {
  if (table === 'profiles') {
    return Promise.resolve(
      fakeDb.profileError
        ? { data: null, error: fakeDb.profileError }
        : { data: single ? fakeDb.profile : [fakeDb.profile], error: null },
    );
  }
  if (table === 'technologies') {
    return Promise.resolve(
      fakeDb.technologiesError
        ? { data: null, error: fakeDb.technologiesError }
        : { data: fakeDb.technologies.filter((item) => item.is_active), error: null },
    );
  }
  if (table === 'user_technologies') {
    return Promise.resolve({
      data: fakeDb.userTechnologies.map((technology_id) => ({ technology_id })),
      error: null,
    });
  }
  return Promise.resolve({ data: null, error: new Error(`Unknown table ${table}`) });
}

type FakeQuery = {
  select: jest.Mock<FakeQuery, [string?]>;
  eq: jest.Mock<FakeQuery, [string, unknown]>;
  order: jest.Mock<FakeQuery, [string]>;
  update: jest.Mock<FakeQuery, [Partial<ProfileRow>]>;
  single: jest.Mock<Promise<Result>, []>;
  then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) => unknown;
};

function createQuery(table: string): FakeQuery {
  const query: FakeQuery = {
    select: jest.fn((_columns?: string) => query),
    eq: jest.fn((_column: string, _value: unknown) => query),
    order: jest.fn((_column: string) => query),
    update: jest.fn((changes: Partial<ProfileRow>) => {
      if (table === 'profiles' && fakeDb.profile && !fakeDb.profileError) {
        fakeDb.profile = { ...fakeDb.profile, ...changes, updated_at: new Date().toISOString() };
      }
      return query;
    }),
    single: jest.fn(() => resultFor(table, true)),
    then: (resolve, reject) => resultFor(table, false).then(resolve, reject),
  };
  return query;
}

type RpcArgs = Record<string, unknown>;

function rpcImpl(name: string, args: RpcArgs = {}): Promise<{ data: null; error: unknown }> {
  if (fakeDb.rpcError) return Promise.resolve({ data: null, error: fakeDb.rpcError });
  const profile = fakeDb.profile;
  if (!profile) return Promise.resolve({ data: null, error: new Error('no profile') });

  if (name === 'complete_onboarding') {
    fakeDb.profile = {
      ...profile,
      display_name: args.p_display_name as string,
      experience_level: args.p_experience_level as ProfileRow['experience_level'],
      primary_goal: args.p_primary_goal as ProfileRow['primary_goal'],
      custom_goal_details: (args.p_custom_goal_details as string | null) ?? null,
      daily_minutes: args.p_daily_minutes as number,
      ui_language: args.p_ui_language as ProfileRow['ui_language'],
      onboarding_completed: true,
      onboarding_completed_at: profile.onboarding_completed_at ?? new Date().toISOString(),
      onboarding_skipped_at: null,
    };
    fakeDb.userTechnologies = [...(args.p_technologies as string[])];
  } else if (name === 'save_personalization') {
    fakeDb.profile = {
      ...profile,
      experience_level: args.p_experience_level as ProfileRow['experience_level'],
      primary_goal: args.p_primary_goal as ProfileRow['primary_goal'],
      custom_goal_details: (args.p_custom_goal_details as string | null) ?? null,
    };
    fakeDb.userTechnologies = [...(args.p_technologies as string[])];
  } else if (name === 'skip_onboarding') {
    if (!profile.onboarding_completed) {
      fakeDb.profile = { ...profile, onboarding_skipped_at: new Date().toISOString() };
    }
  }
  return Promise.resolve({ data: null, error: null });
}

export const supabase = {
  auth: {
    getSession: jest.fn(async () => ({ data: { session: fakeDb.session }, error: null })),
    refreshSession: jest.fn(async () => ({ data: { session: fakeDb.session }, error: null })),
    onAuthStateChange: jest.fn((listener: Listener) => {
      listeners.add(listener);
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
    }),
    startAutoRefresh: jest.fn(async () => undefined),
    stopAutoRefresh: jest.fn(async () => undefined),
    signInWithPassword: jest.fn(async () => ({ data: {}, error: null })),
    signUp: jest.fn(async () => ({ data: { session: null, user: null }, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
    resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null })),
    verifyOtp: jest.fn(async () => ({ data: {}, error: null })),
    updateUser: jest.fn(async () => ({ data: {}, error: null })),
  },
  from: jest.fn((table: string) => createQuery(table)),
  rpc: jest.fn(rpcImpl),
};

export function requireSupabase() {
  return supabase;
}

/** Simulate Supabase reporting an auth change (sign in, sign out, refresh). */
export function emitAuthChange(event: AuthChangeEvent, session: Session | null): void {
  fakeDb.session = session;
  listeners.forEach((listener) => listener(event, session));
}

export function resetFakeSupabase(): void {
  fakeDb.session = null;
  fakeDb.profile = null;
  fakeDb.profileError = null;
  fakeDb.technologies = [...fakeTechnologies];
  fakeDb.technologiesError = null;
  fakeDb.userTechnologies = [];
  fakeDb.rpcError = null;
  listeners.clear();
  supabase.rpc.mockImplementation(rpcImpl);
}
