import { useTranslation } from 'react-i18next';

import { ChoiceGroup, Stack, TextField } from '@/components/ui';
import { DAILY_MINUTES_MAX } from '@/features/profile/profile.schemas';

import { MINUTE_PRESETS } from '../onboarding.schemas';

type MinutesFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  testID?: string;
};

/** Quick picks (15/30/45/60) plus a free value from 5 to 480, bound to one field. */
export function MinutesField({
  value,
  onChange,
  onBlur,
  error,
  testID = 'minutes',
}: MinutesFieldProps) {
  const { t } = useTranslation();
  const numeric = Number(value);

  return (
    <Stack gap="md">
      <ChoiceGroup
        label={t('onboarding.time.presetsLabel')}
        value={MINUTE_PRESETS.some((preset) => preset === numeric) ? numeric : null}
        onChange={(minutes) => onChange(String(minutes))}
        options={MINUTE_PRESETS.map((minutes) => ({
          value: minutes,
          label: t('profileForm.minutesOption', { count: minutes }),
        }))}
        testID={`${testID}-preset`}
      />
      <TextField
        label={t('onboarding.time.customLabel')}
        hint={t('onboarding.time.hint')}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        error={error}
        keyboardType="number-pad"
        maxLength={String(DAILY_MINUTES_MAX).length}
        returnKeyType="done"
        testID={`${testID}-input`}
      />
    </Stack>
  );
}
