import { router } from 'expo-router';
import { Check, RotateCcw } from 'lucide-react-native';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Button, Divider, Inline, Stack, Surface, Tag } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useToastStore } from '@/stores/toast.store';

import { StepScaffold } from '../components/StepScaffold';
import { SummaryRow } from '../components/SummaryRow';
import { useOnboardingFlow } from '../OnboardingFlow';
import {
  STEP_FIELDS,
  onboardingSchema,
  personalizeSchema,
  type OnboardingFormValues,
  type QuestionStep,
} from '../onboarding.schemas';
import { OnboardingRequestError } from '../technologies.service';
import { QUESTION_STEPS, stepHref } from '../steps';
import {
  useCompleteOnboarding,
  useSavePersonalization,
  useTechnologiesQuery,
} from '../useOnboarding';

/**
 * Shows every answer (main goal and technologies prominently) and saves them
 * in one operation. The local draft is cleared only after Supabase confirms;
 * on failure the draft stays and Retry repeats the save.
 */
export function SummaryStep() {
  const { t } = useTranslation();
  const flow = useOnboardingFlow();
  const { trigger } = useFormContext<OnboardingFormValues>();
  const values = useWatch<OnboardingFormValues>() as OnboardingFormValues;
  const catalog = useTechnologiesQuery();
  const complete = useCompleteOnboarding();
  const personalize = useSavePersonalization();
  const showToast = useToastStore((state) => state.show);
  const isPersonalize = flow.mode === 'personalize';
  const mutation = isPersonalize ? personalize : complete;

  const technologyName = (id: string) => catalog.data?.find((item) => item.id === id)?.name ?? id;
  const has = (step: QuestionStep) =>
    (QUESTION_STEPS[flow.mode] as readonly string[]).includes(step);

  const finish = () => {
    flow.clearDraft();
    haptics.success();
    showToast(
      isPersonalize ? t('onboarding.summary.personalizationSaved') : t('onboarding.summary.saved'),
    );
    flow.exit();
  };

  const save = async () => {
    const schema = isPersonalize ? personalizeSchema : onboardingSchema;
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      // Should not happen after the steps, but never save invalid data: show the first problem.
      await trigger();
      const invalid = QUESTION_STEPS[flow.mode].find((step) =>
        STEP_FIELDS[step as QuestionStep].some((field) =>
          parsed.error.issues.some((issue) => issue.path[0] === field),
        ),
      );
      if (invalid) router.push({ pathname: stepHref(invalid), params: { from: 'summary' } });
      return;
    }
    if (isPersonalize) {
      personalize.mutate(personalizeSchema.parse(values), { onSuccess: finish });
    } else {
      complete.mutate(onboardingSchema.parse(values), { onSuccess: finish });
    }
  };

  const errorKey =
    mutation.error instanceof OnboardingRequestError && mutation.error.isNetwork
      ? 'onboarding.summary.errorNetwork'
      : 'onboarding.summary.errorGeneric';

  return (
    <StepScaffold
      testID="onboarding-summary"
      title={
        isPersonalize ? t('onboarding.summary.personalizeTitle') : t('onboarding.summary.title')
      }
      subtitle={t('onboarding.summary.subtitle')}
      position={null}
      onBack={() => flow.backFrom('summary')}
      secondaryAction={
        isPersonalize
          ? {
              label: t('onboarding.cancel'),
              onPress: () => flow.exit({ discardDraft: true }),
              testID: 'onboarding-cancel',
            }
          : undefined
      }
      footer={
        <Button
          label={
            mutation.isError
              ? t('onboarding.summary.retry')
              : isPersonalize
                ? t('onboarding.summary.saveChanges')
                : t('onboarding.summary.save')
          }
          leadingIcon={mutation.isError ? RotateCcw : Check}
          onPress={() => void save()}
          loading={mutation.isPending}
          fullWidth
          testID="onboarding-save"
        />
      }
    >
      <Stack gap="md">
        {mutation.isError ? (
          <InlineMessage tone="error" message={t(errorKey)} testID="onboarding-save-error" />
        ) : null}

        <Surface level="elevated" radius="lg" glow="atmosphere" testID="summary-goal">
          <SummaryRow
            label={t('onboarding.summary.rows.goal')}
            value={values.primary_goal ? t(`onboarding.goal.options.${values.primary_goal}`) : '—'}
            onChange={() => flow.editFromSummary('goal')}
            testID="summary-row-goal"
          />
          <Divider />
          <SummaryRow
            label={t('onboarding.summary.rows.details')}
            value={values.custom_goal_details.trim() || t('onboarding.summary.noDetails')}
          />
          <Divider />
          <SummaryRow
            label={t('onboarding.summary.rows.technologies')}
            onChange={() => flow.editFromSummary('technologies')}
            testID="summary-row-technologies"
          >
            <Inline gap="xs" wrap>
              {values.technologies.map((id) => (
                <Tag key={id} label={technologyName(id)} tone="accent" />
              ))}
            </Inline>
          </SummaryRow>
        </Surface>

        <Surface radius="lg">
          {has('name') ? (
            <>
              <SummaryRow
                label={t('onboarding.summary.rows.name')}
                value={values.display_name.trim()}
                onChange={() => flow.editFromSummary('name')}
                testID="summary-row-name"
              />
              <Divider />
            </>
          ) : null}
          <SummaryRow
            label={t('onboarding.summary.rows.experience')}
            value={
              values.experience_level ? t(`profileForm.levels.${values.experience_level}`) : '—'
            }
            onChange={() => flow.editFromSummary('experience')}
            testID="summary-row-experience"
          />
          {has('time') ? (
            <>
              <Divider />
              <SummaryRow
                label={t('onboarding.summary.rows.time')}
                value={t('onboarding.summary.minutes', { count: Number(values.daily_minutes) })}
                onChange={() => flow.editFromSummary('time')}
                testID="summary-row-time"
              />
            </>
          ) : null}
          {has('language') ? (
            <>
              <Divider />
              <SummaryRow
                label={t('onboarding.summary.rows.language')}
                value={t(`profileForm.languages.${values.ui_language}`)}
                onChange={() => flow.editFromSummary('language')}
                testID="summary-row-language"
              />
            </>
          ) : null}
        </Surface>
      </Stack>
    </StepScaffold>
  );
}
