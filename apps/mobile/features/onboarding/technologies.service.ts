import { z } from 'zod';

import { requireSupabase } from '@/lib/supabase/client';

const technologySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['language', 'frontend', 'backend', 'tools']),
  sort_order: z.number().int(),
});

export type Technology = z.infer<typeof technologySchema>;

export class OnboardingRequestError extends Error {
  readonly isNetwork: boolean;

  constructor(options: { cause?: unknown; isNetwork?: boolean } = {}) {
    super('Onboarding request failed', { cause: options.cause });
    this.name = 'OnboardingRequestError';
    this.isNetwork = options.isNetwork ?? false;
  }
}

/** Network failures surface as a TypeError from fetch or a message from supabase-js. */
export function looksLikeNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';
  return /network|fetch|timed? ?out|offline/i.test(message);
}

export async function fetchTechnologies(): Promise<Technology[]> {
  const { data, error } = await requireSupabase()
    .from('technologies')
    .select('id, name, category, sort_order')
    .eq('is_active', true)
    .order('category')
    .order('sort_order');
  if (error) {
    throw new OnboardingRequestError({ cause: error, isNetwork: looksLikeNetworkError(error) });
  }
  return z.array(technologySchema).parse(data);
}

export async function fetchUserTechnologyIds(userId: string): Promise<string[]> {
  const { data, error } = await requireSupabase()
    .from('user_technologies')
    .select('technology_id')
    .eq('user_id', userId);
  if (error) {
    throw new OnboardingRequestError({ cause: error, isNetwork: looksLikeNetworkError(error) });
  }
  return z
    .array(z.object({ technology_id: z.string() }))
    .parse(data)
    .map((row) => row.technology_id);
}
