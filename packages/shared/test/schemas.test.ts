import { describe, expect, it } from 'vitest';

import {
  errorResponseSchema,
  meResponseSchema,
  onboardingAnswersSchema,
  usageResponseSchema,
} from '../src/index.js';

describe('shared schemas', () => {
  it('accepts valid onboarding answers and rejects broken ones', () => {
    const answers = {
      display_name: 'Анатолий',
      experience_level: 'beginner',
      primary_goal: 'learn_react',
      custom_goal_details: null,
      daily_minutes: 30,
      technologies: ['javascript', 'react'],
      ui_language: 'ru',
    };
    expect(onboardingAnswersSchema.safeParse(answers).success).toBe(true);
    expect(
      onboardingAnswersSchema.safeParse({ ...answers, technologies: ['react', 'react'] }).success,
    ).toBe(false);
    expect(onboardingAnswersSchema.safeParse({ ...answers, daily_minutes: 481 }).success).toBe(
      false,
    );
    expect(onboardingAnswersSchema.safeParse({ ...answers, display_name: '1abc' }).success).toBe(
      false,
    );
  });

  it('describes the API error format with optional quota', () => {
    expect(
      errorResponseSchema.safeParse({
        error: {
          code: 'USAGE_LIMIT_REACHED',
          message: 'Limit',
          requestId: 'r-1',
          quota: { feature: 'chat', used: 30, limit: 30, resetsAt: '2026-11-01T00:00:00.000Z' },
        },
      }).success,
    ).toBe(true);
    expect(
      errorResponseSchema.safeParse({ error: { code: 'NOPE', message: 'x', requestId: 'r' } })
        .success,
    ).toBe(false);
  });

  it('describes /api/me and /api/usage', () => {
    expect(
      meResponseSchema.safeParse({
        userId: '11111111-1111-4111-8111-111111111111',
        displayName: null,
        experienceLevel: null,
        primaryGoal: null,
        dailyMinutes: null,
        uiLanguage: 'en',
        onboardingCompleted: false,
      }).success,
    ).toBe(true);
    expect(
      usageResponseSchema.safeParse({
        plan: 'free',
        period: { start: '2026-10-01', end: '2026-11-01' },
        features: { chat: { used: 1, limit: 30 }, code_review: { used: 0, limit: 10 } },
      }).success,
    ).toBe(true);
  });
});
