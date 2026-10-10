import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, PressableScale, Text } from '@/components/ui';
import { layout, spacing } from '@/constants/tokens';

/** Top "Back" action for stack screens without a native header. */
export function BackBar({ onBack, testID }: { onBack: () => void; testID?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.bar}>
      <PressableScale
        onPress={onBack}
        accessibilityLabel={t('codeReview.back')}
        style={styles.action}
        testID={testID}
      >
        <Icon icon={ChevronLeft} size="md" color="secondary" />
        <Text variant="callout" color="secondary">
          {t('codeReview.back')}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: layout.minTouchTarget,
    paddingRight: spacing.sm,
  },
});
