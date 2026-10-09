import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CodeBlock, SectionHeader, Text } from '@/components/ui';
import { spacing } from '@/constants/tokens';

import type { ConceptPreview as ConceptPreviewData } from '../types';

export function ConceptPreview({ concept }: { concept: ConceptPreviewData }) {
  const { t } = useTranslation();

  return (
    <View>
      <SectionHeader label={t('home.preview.label')} />
      <View style={{ gap: spacing.sm }}>
        <Text variant="headline">{concept.title}</Text>
        <CodeBlock code={concept.code} language={concept.language} />
      </View>
    </View>
  );
}
