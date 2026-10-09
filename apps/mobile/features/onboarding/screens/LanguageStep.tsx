import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ChoiceGroup } from '@/components/ui';
import { UI_LANGUAGES } from '@/features/profile/profile.schemas';

import { ContinueFooter } from '../components/ContinueFooter';
import { StepScaffold } from '../components/StepScaffold';
import type { OnboardingFormValues } from '../onboarding.schemas';
import { useStep } from '../useStep';

export function LanguageStep() {
  const { t } = useTranslation();
  const { control } = useFormContext<OnboardingFormValues>();
  const step = useStep('language');

  return (
    <StepScaffold
      testID="onboarding-language"
      title={t('onboarding.language.title')}
      subtitle={t('onboarding.language.subtitle')}
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
        name="ui_language"
        render={({ field }) => (
          <ChoiceGroup
            label={t('profileForm.uiLanguage')}
            value={field.value}
            onChange={field.onChange}
            hint={field.value === 'en' ? undefined : t('onboarding.language.hint')}
            options={UI_LANGUAGES.map((language) => ({
              value: language,
              label: t(`profileForm.languages.${language}`),
            }))}
            testID="onboarding-language-option"
          />
        )}
      />
    </StepScaffold>
  );
}
