import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ChoiceGroup } from '@/components/ui';
import { EXPERIENCE_LEVELS } from '@/features/profile/profile.schemas';

import { ContinueFooter } from '../components/ContinueFooter';
import { StepScaffold } from '../components/StepScaffold';
import type { OnboardingFormValues } from '../onboarding.schemas';
import { useStep } from '../useStep';

export function ExperienceStep() {
  const { t } = useTranslation();
  const { control } = useFormContext<OnboardingFormValues>();
  const step = useStep('experience');

  return (
    <StepScaffold
      testID="onboarding-experience"
      title={t('onboarding.experience.title')}
      subtitle={t('onboarding.experience.subtitle')}
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
        name="experience_level"
        render={({ field }) => (
          <ChoiceGroup
            label={t('profileForm.experienceLevel')}
            layout="list"
            value={field.value}
            onChange={field.onChange}
            options={EXPERIENCE_LEVELS.map((level) => ({
              value: level,
              label: t(`profileForm.levels.${level}`),
              description: t(`profileForm.levelHints.${level}`),
            }))}
            testID="onboarding-level"
          />
        )}
      />
    </StepScaffold>
  );
}
