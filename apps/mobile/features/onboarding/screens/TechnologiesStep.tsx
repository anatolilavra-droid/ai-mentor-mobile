import { Layers } from 'lucide-react-native';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EmptyState, ErrorState, Skeleton } from '@/components/states';
import { Inline, Text } from '@/components/ui';
import { spacing } from '@/constants/tokens';

import { ContinueFooter } from '../components/ContinueFooter';
import { StepScaffold } from '../components/StepScaffold';
import { TechnologyPicker } from '../components/TechnologyPicker';
import { TECHNOLOGIES_MAX, type OnboardingFormValues } from '../onboarding.schemas';
import { useTechnologiesQuery } from '../useOnboarding';
import { useStep } from '../useStep';

const SKELETON_CHIPS = [96, 120, 80, 104, 88, 112, 72, 128];

export function TechnologiesStep() {
  const { t } = useTranslation();
  const { control } = useFormContext<OnboardingFormValues>();
  const step = useStep('technologies');
  const catalog = useTechnologiesQuery();
  const count = step.values.technologies.length;

  const hint =
    count === 0
      ? t('onboarding.technologies.needOne')
      : count >= TECHNOLOGIES_MAX
        ? t('onboarding.technologies.limitReached', { max: TECHNOLOGIES_MAX })
        : undefined;

  return (
    <StepScaffold
      testID="onboarding-technologies"
      title={t('onboarding.technologies.title')}
      subtitle={t('onboarding.technologies.subtitle')}
      position={step.position}
      onBack={step.onBack}
      secondaryAction={step.secondaryAction}
      footer={
        <ContinueFooter
          label={step.continueLabel}
          onPress={step.onContinue}
          disabled={!step.canContinue || !catalog.data}
          hint={hint}
        />
      }
    >
      <Text
        variant="label"
        color={count > 0 ? 'accent' : 'muted'}
        accessibilityLiveRegion="polite"
        testID="technologies-counter"
        style={{ paddingBottom: spacing.sm }}
      >
        {t('onboarding.technologies.counter', { count, max: TECHNOLOGIES_MAX })}
      </Text>

      {catalog.isPending ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('onboarding.technologies.loading')}
          testID="technologies-loading"
        >
          <Inline gap="xs" wrap>
            {SKELETON_CHIPS.map((width, index) => (
              <Skeleton key={index} width={width} height={spacing.xxl} radius="full" />
            ))}
          </Inline>
        </View>
      ) : catalog.isError ? (
        <ErrorState
          title={t('onboarding.technologies.errorTitle')}
          message={t('onboarding.technologies.errorMessage')}
          onRetry={() => void catalog.refetch()}
          testID="technologies"
        />
      ) : catalog.data.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={t('onboarding.technologies.emptyTitle')}
          description={t('onboarding.technologies.emptyMessage')}
          testID="technologies-empty"
        />
      ) : (
        <Controller
          control={control}
          name="technologies"
          render={({ field }) => (
            <TechnologyPicker
              technologies={catalog.data}
              selected={field.value}
              onChange={field.onChange}
              max={TECHNOLOGIES_MAX}
            />
          )}
        />
      )}
    </StepScaffold>
  );
}
