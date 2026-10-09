import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Button, Stack, Surface, Tag, Text } from '@/components/ui';

/** Shown after "Skip for now": one calm invitation to finish onboarding. */
export function FinishSetupCard() {
  const { t } = useTranslation();
  return (
    <Surface level="elevated" radius="lg" glow="atmosphere" testID="finish-setup-card">
      <Stack gap="sm">
        <Tag label={t('home.finishSetup.label')} tone="violet" />
        <Text variant="title2">{t('home.finishSetup.title')}</Text>
        <Text variant="callout" color="secondary">
          {t('home.finishSetup.description')}
        </Text>
        <Button
          label={t('home.finishSetup.action')}
          trailingIcon={ArrowRight}
          variant="secondary"
          size="md"
          onPress={() => router.push('/onboarding')}
          testID="finish-setup-action"
        />
      </Stack>
    </Surface>
  );
}
