import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/useAuth';
import type { ProfileUpdate } from '@/types/database';

import type { Profile } from './profile.schemas';
import { fetchProfile, updateProfile } from './profile.service';

export const profileKeys = {
  detail: (userId: string) => ['profile', userId] as const,
};

export function useProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? 'anonymous'),
    queryFn: () => fetchProfile(userId as string),
    enabled: Boolean(userId),
  });
}

/**
 * The signed-in user's profile. Screens behind the profile gate can rely on
 * it being loaded, because the root layout waits for it.
 */
export function useCurrentProfile(): Profile {
  const userId = useUserId();
  const { data } = useProfileQuery(userId);
  if (!data) throw new Error('useCurrentProfile used before the profile loaded');
  return data;
}

export function useUpdateProfile() {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: ProfileUpdate) => updateProfile(userId, changes),
    onSuccess: (profile) => client.setQueryData(profileKeys.detail(userId), profile),
  });
}
