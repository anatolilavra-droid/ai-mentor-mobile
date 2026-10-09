import type { Request } from 'express';

import { AppError } from '../errors/AppError.js';
import type { MeResponse } from '@ai-mentor/shared';
import type { ProfileService } from '../services/profile.service.js';

export function createMeHandler(profileService: ProfileService) {
  return async ({ req }: { req: Request }): Promise<MeResponse> => {
    if (!req.auth) throw new AppError('UNAUTHORIZED');
    const profile = await profileService.getOwnProfile({
      accessToken: req.auth.accessToken,
      userId: req.auth.userId,
      signal: req.abortSignal,
    });
    return {
      userId: profile.id,
      displayName: profile.display_name,
      experienceLevel: profile.experience_level,
      primaryGoal: profile.primary_goal,
      dailyMinutes: profile.daily_minutes,
      uiLanguage: profile.ui_language,
      onboardingCompleted: profile.onboarding_completed,
    };
  };
}
