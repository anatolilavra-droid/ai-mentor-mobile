import { FolderKanban, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/states';
import { spacing } from '@/constants/tokens';
import { ComingSoonFooter } from '@/features/shared/ComingSoonFooter';
import { FeaturePreview } from '@/features/shared/FeaturePreview';

export function ProjectsScreen() {
  const { t } = useTranslation();

  return (
    <Screen
      testID="projects-screen"
      footer={<ComingSoonFooter label={t('projects.primaryAction')} icon={Plus} />}
    >
      <ScreenHeader
        eyebrow={t('projects.eyebrow')}
        title={t('projects.title')}
        subtitle={t('projects.subtitle')}
      />
      <View style={{ gap: spacing.lg }}>
        <EmptyState
          icon={FolderKanban}
          title={t('projects.emptyTitle')}
          description={t('projects.emptyDescription')}
          testID="projects-empty"
        />
        <FeaturePreview
          label={t('projects.previewLabel')}
          items={[
            t('projects.preview.tasks'),
            t('projects.preview.notes'),
            t('projects.preview.next'),
          ]}
        />
      </View>
    </Screen>
  );
}
