import { requireSupabase } from '@/lib/supabase/client';

import type { OnboardingOutput, PersonalizeOutput } from './onboarding.schemas';
import { OnboardingRequestError, looksLikeNetworkError } from './technologies.service';

/** Saves all onboarding answers and technologies in one database transaction. */
export async function completeOnboarding(values: OnboardingOutput): Promise<void> {
  const { error } = await requireSupabase().rpc('complete_onboarding', {
    p_display_name: values.display_name,
    p_experience_level: values.experience_level,
    p_primary_goal: values.primary_goal,
    p_custom_goal_details: values.custom_goal_details,
    p_daily_minutes: values.daily_minutes,
    p_ui_language: values.ui_language,
    p_technologies: values.technologies,
  });
  if (error) {
    throw new OnboardingRequestError({ cause: error, isNetwork: looksLikeNetworkError(error) });
  }
}

/** Saves level, goal, goal details and technologies in one database transaction. */
export async function savePersonalization(values: PersonalizeOutput): Promise<void> {
  const { error } = await requireSupabase().rpc('save_personalization', {
    p_experience_level: values.experience_level,
    p_primary_goal: values.primary_goal,
    p_custom_goal_details: values.custom_goal_details,
    p_technologies: values.technologies,
  });
  if (error) {
    throw new OnboardingRequestError({ cause: error, isNetwork: looksLikeNetworkError(error) });
  }
}

export async function skipOnboarding(): Promise<void> {
  const { error } = await requireSupabase().rpc('skip_onboarding');
  if (error) {
    throw new OnboardingRequestError({ cause: error, isNetwork: looksLikeNetworkError(error) });
  }
}
