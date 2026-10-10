import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/constants/tokens';
import { useMotionPreference } from '@/hooks/useMotionPreference';

/** After this long the free server is probably waking up from sleep. */
export const WAKE_HINT_AFTER_MS = 8_000;

/** "Mentor is thinking…", plus a calm hint when the server needs time to wake up. */
export function ThinkingIndicator({
  label,
  testID = 'chat-thinking',
}: { label?: string; testID?: string } = {}) {
  const { t } = useTranslation();
  const { reduceMotion } = useMotionPreference();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), WAKE_HINT_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.row} accessibilityLiveRegion="polite" testID={testID}>
      {reduceMotion ? null : <ActivityIndicator size="small" color={colors.accent.primary} />}
      <View style={styles.texts}>
        <Text variant="callout" color="secondary">
          {label ?? t('chat.thinking')}
        </Text>
        {slow ? (
          <Text variant="caption" color="muted" testID="chat-waking">
            {t('chat.waking')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  texts: {
    flex: 1,
    gap: spacing.xxs,
  },
});
