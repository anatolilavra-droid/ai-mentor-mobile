import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useToastStore } from '@/stores/toast.store';

import { useOnboardingFlow } from './OnboardingFlow';
import { isStepValid, type OnboardingFormValues, type QuestionStep } from './onboarding.schemas';
import { stepPosition } from './steps';
import { useSkipOnboarding } from './useOnboarding';

/** Everything a question step needs: progress, Continue, Back, Skip or Cancel. */
export function useStep(step: QuestionStep) {
  const { t } = useTranslation();
  const flow = useOnboardingFlow();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const values = useWatch<OnboardingFormValues>() as OnboardingFormValues;
  const skip = useSkipOnboarding();
  const showToast = useToastStore((state) => state.show);
  const returnToSummary = from === 'summary';

  const onBack = useCallback(() => {
    if (returnToSummary) router.back();
    else flow.backFrom(step);
  }, [flow, returnToSummary, step]);

  const onContinue = () => flow.continueFrom(step, { returnToSummary });

  const confirmSkip = () => {
    Alert.alert(t('onboarding.skipConfirm.title'), t('onboarding.skipConfirm.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('onboarding.skipConfirm.confirm'),
        onPress: () =>
          skip.mutate(undefined, {
            onSuccess: () => flow.exit(),
            onError: () => showToast(t('onboarding.skipError'), 'neutral'),
          }),
      },
    ]);
  };

  const secondaryAction =
    flow.mode === 'onboarding'
      ? { label: t('onboarding.skip'), onPress: confirmSkip, testID: 'onboarding-skip' }
      : {
          label: t('onboarding.cancel'),
          onPress: () => flow.exit({ discardDraft: true }),
          testID: 'onboarding-cancel',
        };

  return {
    mode: flow.mode,
    position: stepPosition(flow.mode, step),
    canContinue: isStepValid(step, values),
    values,
    onBack,
    onContinue,
    secondaryAction,
    continueLabel: t('onboarding.continue'),
  };
}
