import type { QuotaDetail } from '@ai-mentor/shared';
import { Gauge } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { borderWidths, colors, radii, spacing } from '@/constants/tokens';

/** Shown when the monthly limit is used up. There are no payments yet: Pro is announced only. */
export function LimitReachedCard({ quota }: { quota: QuotaDetail | null }) {
  const { t, i18n } = useTranslation();
  const resetsOn = quota
    ? new Date(quota.resetsAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' })
    : null;

  return (
    <View style={styles.card} accessibilityRole="alert" testID="chat-limit">
      <Icon icon={Gauge} size="lg" color="warning" />
      <Text variant="bodyMedium">{t('chat.limit.title')}</Text>
      {quota ? (
        <Text variant="callout" color="secondary">
          {t('chat.limit.used', { used: quota.used, limit: quota.limit })}
        </Text>
      ) : null}
      {resetsOn ? (
        <Text variant="callout" color="secondary">
          {t('chat.limit.resets', { date: resetsOn })}
        </Text>
      ) : null}
      <Text variant="caption" color="muted">
        {t('chat.limit.pro')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: borderWidths.hairline,
    borderColor: colors.status.warning,
    backgroundColor: colors.surface.default,
  },
});
