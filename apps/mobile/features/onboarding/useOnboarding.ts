import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/useAuth';
import { profileKeys } from '@/features/profile/useProfile';

import type { OnboardingOutput, PersonalizeOutput } from './onboarding.schemas';
import { completeOnboarding, savePersonalization, skipOnboarding } from './onboarding.service';
import { fetchTechnologies, fetchUserTechnologyIds } from './technologies.service';

export const onboardingKeys = {
  technologies: ['technologies'] as const,
  userTechnologies: (userId: string) => ['user-technologies', userId] as const,
};

/** The catalog changes only with migrations, so it stays fresh for a long time. */
export function useTechnologiesQuery() {
  return useQuery({
    queryKey: onboardingKeys.technologies,
    queryFn: fetchTechnologies,
    staleTime: 60 * 60 * 1000,
  });
}

export function useUserTechnologiesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: onboardingKeys.userTechnologies(userId ?? 'anonymous'),
    queryFn: () => fetchUserTechnologyIds(userId as string),
    enabled: Boolean(userId),
  });
}

/** After a save, reload the profile and technologies so every screen shows the new answers. */
function useRefreshAfterSave() {
  const userId = useUserId();
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.refetchQueries({ queryKey: profileKeys.detail(userId) }),
      client.refetchQueries({ queryKey: onboardingKeys.userTechnologies(userId) }),
    ]);
}

export function useCompleteOnboarding() {
  const refresh = useRefreshAfterSave();
  return useMutation({
    mutationFn: async (values: OnboardingOutput) => {
      await completeOnboarding(values);
      await refresh();
    },
  });
}

export function useSavePersonalization() {
  const refresh = useRefreshAfterSave();
  return useMutation({
    mutationFn: async (values: PersonalizeOutput) => {
      await savePersonalization(values);
      await refresh();
    },
  });
}

export function useSkipOnboarding() {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await skipOnboarding();
      await client.refetchQueries({ queryKey: profileKeys.detail(userId) });
    },
  });
}
