import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { TextField } from '@/components/ui';
import { DISPLAY_NAME_MAX } from '@/features/profile/profile.schemas';
import { useErrorText } from '@/hooks/useErrorText';

import { ContinueFooter } from '../components/ContinueFooter';
import { StepScaffold } from '../components/StepScaffold';
import type { OnboardingFormValues } from '../onboarding.schemas';
import { useStep } from '../useStep';

export function NameStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { control } = useFormContext<OnboardingFormValues>();
  const step = useStep('name');

  return (
    <StepScaffold
      testID="onboarding-name"
      title={t('onboarding.name.title')}
      subtitle={t('onboarding.name.subtitle')}
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
        name="display_name"
        render={({ field, fieldState }) => (
          <TextField
            ref={field.ref}
            label={t('profileForm.displayName')}
            placeholder={t('profileForm.displayNamePlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errorText(fieldState.error?.message)}
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            maxLength={DISPLAY_NAME_MAX}
            returnKeyType="next"
            onSubmitEditing={() => step.canContinue && step.onContinue()}
            testID="onboarding-name-input"
          />
        )}
      />
    </StepScaffold>
  );
}
