import { MessageSquareText, SendHorizontal } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/states';
import { Icon, Text } from '@/components/ui';
import { borderWidths, colors, layout, opacity, radii, spacing } from '@/constants/tokens';
import { FeaturePreview } from '@/features/shared/FeaturePreview';

/** Visual stand-in for the future composer. Not focusable as an input. */
function ComposerPreview() {
  const { t } = useTranslation();

  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={styles.composer}
        accessible
        accessibilityLabel={t('chat.inputA11y')}
        accessibilityState={{ disabled: true }}
        testID="chat-composer-preview"
      >
        <Text variant="body" color="muted" style={styles.placeholder} numberOfLines={1}>
          {t('chat.inputPlaceholder')}
        </Text>
        <View style={styles.send}>
          <Icon icon={SendHorizontal} size="md" color="onAccent" />
        </View>
      </View>
      <Text variant="caption" color="muted" align="center">
        {t('common.comingInUpdate')}
      </Text>
    </View>
  );
}

export function ChatScreen() {
  const { t } = useTranslation();

  return (
    <Screen testID="chat-screen" footer={<ComposerPreview />}>
      <ScreenHeader
        eyebrow={t('chat.eyebrow')}
        title={t('chat.title')}
        subtitle={t('chat.subtitle')}
      />
      <View style={{ gap: spacing.lg }}>
        <EmptyState
          icon={MessageSquareText}
          title={t('chat.emptyTitle')}
          description={t('chat.emptyDescription')}
          testID="chat-empty"
        />
        <FeaturePreview
          label={t('chat.previewLabel')}
          items={[t('chat.preview.questions'), t('chat.preview.explain'), t('chat.preview.fix')]}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  composer: {
    minHeight: layout.minTouchTarget + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xxs,
    borderRadius: radii.full,
    backgroundColor: colors.surface.default,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.strong,
  },
  placeholder: {
    flex: 1,
  },
  send: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    opacity: opacity.disabled,
  },
});
