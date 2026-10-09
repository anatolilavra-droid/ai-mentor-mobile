import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ErrorState, FullScreenState, LoadingState } from '@/components/states';
import { useUserId } from '@/features/auth/useAuth';
import {
  EXPERIENCE_LEVELS,
  PRIMARY_GOALS,
  UI_LANGUAGES,
  getOnboardingState,
  type Profile,
} from '@/features/profile/profile.schemas';
import { useCurrentProfile } from '@/features/profile/useProfile';
import {
  readDraft,
  useDraftsHydrated,
  useOnboardingDraftStore,
} from '@/stores/onboardingDraft.store';

import {
  TECHNOLOGIES_MAX,
  isQuestionStep,
  isStepValid,
  schemaFor,
  type OnboardingDraft,
  type OnboardingFormValues,
} from './onboarding.schemas';
import {
  QUESTION_STEPS,
  nextStep,
  previousStep,
  stepHref,
  type OnboardingMode,
  type OnboardingStep,
} from './steps';
import { useUserTechnologiesQuery } from './useOnboarding';

type FlowContextValue = {
  mode: OnboardingMode;
  /** The step saved in the draft when the flow opened, used to resume. */
  resumeStep: OnboardingStep | null;
  /** First step whose answer is still missing or invalid. */
  firstIncompleteStep: () => OnboardingStep;
  /** Save answers + step on the device, then go forward (or back to the summary). */
  continueFrom: (step: OnboardingStep, options?: { returnToSummary?: boolean }) => void;
  /** Save answers, then go to the previous step (or leave the flow from the first one). */
  backFrom: (step: OnboardingStep) => void;
  /** Open one step from the summary; Continue there returns to the summary. */
  editFromSummary: (step: OnboardingStep) => void;
  /** Close the flow (back to Profile or Home); optionally discard this mode's draft. */
  exit: (options?: { discardDraft?: boolean }) => void;
  clearDraft: () => void;
};

const FlowContext = createContext<FlowContextValue | null>(null);

export function useOnboardingFlow(): FlowContextValue {
  const value = useContext(FlowContext);
  if (!value) throw new Error('useOnboardingFlow must be used inside OnboardingFlowProvider');
  return value;
}

function pickEnum<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/** Saved answers first, then what the profile already has. Unknown values are dropped. */
export function buildDefaults(
  profile: Profile,
  userTechnologies: readonly string[],
  draft: OnboardingDraft | null,
): OnboardingFormValues {
  const saved = draft?.values ?? {};
  const technologies = saved.technologies ?? [...userTechnologies];
  return {
    display_name: saved.display_name ?? profile.display_name ?? '',
    experience_level:
      pickEnum(EXPERIENCE_LEVELS, saved.experience_level) ?? profile.experience_level ?? undefined,
    primary_goal: pickEnum(PRIMARY_GOALS, saved.primary_goal) ?? profile.primary_goal ?? undefined,
    custom_goal_details: saved.custom_goal_details ?? profile.custom_goal_details ?? '',
    daily_minutes: saved.daily_minutes ?? profile.daily_minutes?.toString() ?? '',
    technologies: [...new Set(technologies)].slice(0, TECHNOLOGIES_MAX),
    ui_language: pickEnum(UI_LANGUAGES, saved.ui_language) ?? profile.ui_language,
  };
}

/**
 * Wraps the onboarding routes: waits for saved drafts and current answers,
 * then provides one form for the whole flow plus step navigation that saves
 * the draft after every step.
 */
export function OnboardingFlowProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const userId = useUserId();
  const profile = useCurrentProfile();
  const hydrated = useDraftsHydrated();
  const userTechnologies = useUserTechnologiesQuery(userId);
  // Fixed for the lifetime of the flow: saving flips onboarding_completed before
  // the flow closes, and switching mode mid-flow would remount the form.
  const [mode] = useState<OnboardingMode>(() =>
    profile.onboarding_completed ? 'personalize' : 'onboarding',
  );

  if (!hydrated || userTechnologies.isPending) {
    return (
      <FullScreenState testID="onboarding-loading">
        <LoadingState label={t('onboarding.restoring')} blocks={2} />
      </FullScreenState>
    );
  }

  if (userTechnologies.isError) {
    return (
      <FullScreenState testID="onboarding-load-error">
        <ErrorState
          title={t('onboarding.loadError.title')}
          message={t('onboarding.loadError.message')}
          onRetry={() => void userTechnologies.refetch()}
          testID="onboarding-load"
        />
      </FullScreenState>
    );
  }

  return (
    <FlowForm
      key={mode}
      mode={mode}
      userId={userId}
      profile={profile}
      userTechnologies={userTechnologies.data}
    >
      {children}
    </FlowForm>
  );
}

type FlowFormProps = {
  mode: OnboardingMode;
  userId: string;
  profile: Profile;
  userTechnologies: string[];
  children: ReactNode;
};

function FlowForm({ mode, userId, profile, userTechnologies, children }: FlowFormProps) {
  const saveDraft = useOnboardingDraftStore((state) => state.saveDraft);
  const clearStoredDraft = useOnboardingDraftStore((state) => state.clearDraft);

  // Read once when the flow opens; later saves must not reset the form.
  const [initialDraft] = useState(() => readDraft(userId, mode));

  const form = useForm<OnboardingFormValues>({
    // The mode's schema validates each field; typed output is parsed again on save.
    resolver: zodResolver(schemaFor(mode)) as unknown as Resolver<OnboardingFormValues>,
    defaultValues: buildDefaults(profile, userTechnologies, initialDraft),
    mode: 'onTouched',
  });

  const persist = useCallback(
    (currentStep: OnboardingStep) => {
      saveDraft({ userId, mode, currentStep, values: form.getValues() });
    },
    [form, mode, saveDraft, userId],
  );

  // Leaving is deferred until the route guards allow the target: after a save or a
  // skip the tabs unlock only once the refreshed profile has been rendered.
  const [exitRequested, setExitRequested] = useState(false);
  const exitTarget = mode === 'personalize' ? '/profile' : '/';
  const tabsUnlocked = getOnboardingState(profile) !== 'pending';

  useEffect(() => {
    if (exitRequested && tabsUnlocked) router.dismissTo(exitTarget);
  }, [exitRequested, exitTarget, tabsUnlocked]);

  const exit = useCallback(
    (options?: { discardDraft?: boolean }) => {
      if (options?.discardDraft) clearStoredDraft(userId, mode);
      setExitRequested(true);
    },
    [clearStoredDraft, mode, userId],
  );

  const value = useMemo<FlowContextValue>(
    () => ({
      mode,
      resumeStep: initialDraft?.currentStep ?? null,
      firstIncompleteStep: () => {
        const values = form.getValues();
        return (
          QUESTION_STEPS[mode].find((step) => isQuestionStep(step) && !isStepValid(step, values)) ??
          'summary'
        );
      },
      continueFrom: (step, options) => {
        const target = options?.returnToSummary ? 'summary' : nextStep(mode, step);
        if (!target) return;
        persist(target);
        if (options?.returnToSummary) router.back();
        else router.push(stepHref(target));
      },
      backFrom: (step) => {
        const target = previousStep(mode, step);
        if (!target) {
          // First question: onboarding returns to Welcome, personalize leaves the flow.
          persist(step);
          if (mode === 'personalize') exit();
          else router.replace({ pathname: '/onboarding', params: { intro: '1' } });
          return;
        }
        persist(target);
        if (router.canGoBack()) router.back();
        else router.replace(stepHref(target));
      },
      editFromSummary: (step) => {
        if (!isQuestionStep(step)) return;
        persist('summary');
        router.push({ pathname: stepHref(step), params: { from: 'summary' } });
      },
      exit,
      clearDraft: () => clearStoredDraft(userId, mode),
    }),
    [clearStoredDraft, exit, form, initialDraft, mode, persist, userId],
  );

  return (
    <FormProvider {...form}>
      <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
    </FormProvider>
  );
}
