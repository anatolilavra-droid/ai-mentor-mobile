import { GraduationCap, Route } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/states';
import { spacing } from '@/constants/tokens';
import { ComingSoonFooter } from '@/features/shared/ComingSoonFooter';
import { FeaturePreview } from '@/features/shared/FeaturePreview';

export function LearnScreen() {
  const { t } = useTranslation();

  return (
    <Screen
      testID="learn-screen"
      footer={<ComingSoonFooter label={t('learn.primaryAction')} icon={Route} />}
    >
      <ScreenHeader
        eyebrow={t('learn.eyebrow')}
        title={t('learn.title')}
        subtitle={t('learn.subtitle')}
      />
      <View style={{ gap: spacing.lg }}>
        <EmptyState
          icon={GraduationCap}
          title={t('learn.emptyTitle')}
          description={t('learn.emptyDescription')}
          testID="learn-empty"
        />
        <FeaturePreview
          label={t('learn.previewLabel')}
          items={[t('learn.preview.plan'), t('learn.preview.tasks'), t('learn.preview.progress')]}
        />
      </View>
    </Screen>
  );
}
