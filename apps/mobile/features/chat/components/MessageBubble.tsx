import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Tag, Text } from '@/components/ui';
import { borderWidths, colors, radii, spacing } from '@/constants/tokens';

import type { ChatEntry } from '../chat.store';
import { MarkdownView } from '../markdown/MarkdownView';

/** A learner question (right, plain text) or a mentor answer (full width, formatted). */
export function MessageBubble({ entry }: { entry: ChatEntry }) {
  const { t } = useTranslation();

  if (entry.role === 'user') {
    return (
      <View
        style={[styles.user, entry.failed && styles.userFailed]}
        accessible
        accessibilityLabel={t('chat.youSaid', { message: entry.content })}
        testID="chat-user-message"
      >
        <Text variant="body" selectable>
          {entry.content}
        </Text>
        {entry.failed ? (
          <Text variant="caption" color="error">
            {t('chat.notSent')}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.assistant} testID="chat-assistant-message">
      <View style={styles.assistantHeader}>
        <Text variant="label" color="accent">
          {t('chat.mentor')}
        </Text>
        {entry.provider === 'mock' ? <Tag label={t('chat.demoAnswer')} /> : null}
      </View>
      <MarkdownView source={entry.content} />
    </View>
  );
}

const styles = StyleSheet.create({
  user: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surface.elevated,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.subtle,
  },
  userFailed: {
    borderColor: colors.status.error,
  },
  assistant: {
    gap: spacing.xs,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
