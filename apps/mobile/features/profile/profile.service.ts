import { requireSupabase } from '@/lib/supabase/client';
import type { ProfileUpdate } from '@/types/database';

import { profileRowSchema, type Profile } from './profile.schemas';

const PROFILE_COLUMNS =
  'id, display_name, experience_level, learning_goal, daily_minutes, ui_language, created_at, updated_at';

export class ProfileRequestError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('Profile request failed', options);
    this.name = 'ProfileRequestError';
  }
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .single();
  if (error) throw new ProfileRequestError({ cause: error });
  return profileRowSchema.parse(data);
}

export async function updateProfile(userId: string, changes: ProfileUpdate): Promise<Profile> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .update(changes)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw new ProfileRequestError({ cause: error });
  return profileRowSchema.parse(data);
}
