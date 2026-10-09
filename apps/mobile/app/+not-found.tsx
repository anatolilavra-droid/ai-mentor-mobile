import { router } from 'expo-router';
import { Compass } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <Screen
      withBottomInset
      testID="not-found-screen"
      footer={
        <Button
          label={t('common.backHome')}
          leadingIcon={Compass}
          fullWidth
          onPress={() => router.replace('/')}
        />
      }
    >
      <ScreenHeader
        eyebrow={t('notFound.eyebrow')}
        title={t('notFound.title')}
        subtitle={t('notFound.description')}
      />
    </Screen>
  );
}
