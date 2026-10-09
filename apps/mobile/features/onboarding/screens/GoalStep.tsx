import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ChoiceGroup, Stack, TextField } from '@/components/ui';
import { CUSTOM_GOAL_DETAILS_MAX } from '@/features/profile/profile.schemas';
import { useErrorText } from '@/hooks/useErrorText';

import { ContinueFooter } from '../components/ContinueFooter';
import { StepScaffold } from '../components/StepScaffold';
import { PRIMARY_GOALS } from '../goals';
import type { OnboardingFormValues } from '../onboarding.schemas';
import { useStep } from '../useStep';

export function GoalStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { control } = useFormContext<OnboardingFormValues>();
  const step = useStep('goal');

  return (
    <StepScaffold
      testID="onboarding-goal"
      title={t('onboarding.goal.title')}
      subtitle={t('onboarding.goal.subtitle')}
      position={step.position}
      onBack={step.onBack}
      secondaryAction={step.secondaryAction}
      footer={
        <ContinueFooter
          label={step.continueLabel}
          onPress={step.onContinue}
          disabled={!step.canContinue}
        />
      }
    >
      <Stack gap="lg">
        <Controller
          control={control}
          name="primary_goal"
          render={({ field }) => (
            <ChoiceGroup
              label={t('onboarding.goal.title')}
              layout="list"
              value={field.value}
              onChange={field.onChange}
              options={PRIMARY_GOALS.map((goal) => ({
                value: goal,
                label: t(`onboarding.goal.options.${goal}`),
              }))}
              testID="onboarding-goal-option"
            />
          )}
        />
        <Controller
          control={control}
          name="custom_goal_details"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label={`${t('onboarding.goal.detailsLabel')} · ${t('common.optional')}`}
              placeholder={t('onboarding.goal.detailsPlaceholder')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errorText(fieldState.error?.message)}
              multiline
              maxLength={CUSTOM_GOAL_DETAILS_MAX}
              showCounter
              testID="onboarding-goal-details"
            />
          )}
        />
      </Stack>
    </StepScaffold>
  );
}
