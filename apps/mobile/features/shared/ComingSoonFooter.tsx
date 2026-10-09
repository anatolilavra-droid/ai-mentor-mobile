import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { spacing } from '@/constants/tokens';

type ComingSoonFooterProps = {
  label: string;
  icon?: LucideIcon;
  testID?: string;
};

/** Honest primary action for placeholder screens: visible, explained, inactive. */
export function ComingSoonFooter({ label, icon, testID }: ComingSoonFooterProps) {
  const { t } = useTranslation();

  return (
    <View style={{ gap: spacing.xs }}>
      <Button
        label={label}
        leadingIcon={icon}
        fullWidth
        disabled
        accessibilityHint={t('common.comingInUpdate')}
        testID={testID}
      />
      <Text variant="caption" color="muted" align="center">
        {t('common.comingInUpdate')}
      </Text>
    </View>
  );
}
