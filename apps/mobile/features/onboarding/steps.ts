/**
 * Onboarding has two modes:
 * - "onboarding": the full first-run flow (also used to finish after "Skip for now").
 * - "personalize": reopened from Profile when onboarding is completed; only the
 *   personalization answers (name, time and language live in Edit profile).
 */
export type OnboardingMode = 'onboarding' | 'personalize';

export type OnboardingStep =
  'name' | 'experience' | 'goal' | 'time' | 'technologies' | 'language' | 'summary';

/** Steps before the summary, in order. The summary always comes last. */
export const QUESTION_STEPS: Record<OnboardingMode, readonly OnboardingStep[]> = {
  onboarding: ['name', 'experience', 'goal', 'time', 'technologies', 'language'],
  personalize: ['experience', 'goal', 'technologies'],
};

export function stepsFor(mode: OnboardingMode): readonly OnboardingStep[] {
  return [...QUESTION_STEPS[mode], 'summary'];
}

export function nextStep(mode: OnboardingMode, step: OnboardingStep): OnboardingStep | null {
  const steps = stepsFor(mode);
  return steps[steps.indexOf(step) + 1] ?? null;
}

export function previousStep(mode: OnboardingMode, step: OnboardingStep): OnboardingStep | null {
  const steps = stepsFor(mode);
  const index = steps.indexOf(step);
  return index > 0 ? (steps[index - 1] ?? null) : null;
}

/** 1-based position among the question steps; the summary has none. */
export function stepPosition(
  mode: OnboardingMode,
  step: OnboardingStep,
): { index: number; total: number } | null {
  const questions = QUESTION_STEPS[mode];
  const index = questions.indexOf(step);
  return index === -1 ? null : { index: index + 1, total: questions.length };
}

export function stepHref(step: OnboardingStep): `/onboarding/${OnboardingStep}` {
  return `/onboarding/${step}`;
}
