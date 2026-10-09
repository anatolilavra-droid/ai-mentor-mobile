import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useErrorText } from '@/hooks/useErrorText';

import { ContinueFooter } from '../components/ContinueFooter';
import { MinutesField } from '../components/MinutesField';
import { StepScaffold } from '../components/StepScaffold';
import type { OnboardingFormValues } from '../onboarding.schemas';
import { useStep } from '../useStep';

export function TimeStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { control } = useFormContext<OnboardingFormValues>();
  const step = useStep('time');

  return (
    <StepScaffold
      testID="onboarding-time"
      title={t('onboarding.time.title')}
      subtitle={t('onboarding.time.subtitle')}
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
      <Controller
        control={control}
        name="daily_minutes"
        render={({ field, fieldState }) => (
          <MinutesField
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errorText(fieldState.error?.message)}
            testID="onboarding-minutes"
          />
        )}
      />
    </StepScaffold>
  );
}
