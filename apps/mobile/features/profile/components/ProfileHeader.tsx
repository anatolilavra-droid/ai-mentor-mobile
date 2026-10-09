import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Inline, Tag, Text } from '@/components/ui';
import { borderWidths, colors, radii, shadows, spacing } from '@/constants/tokens';

type ProfileHeaderProps = {
  name: string;
  stack: readonly string[];
};

const AVATAR_SIZE = spacing.huge;

export function ProfileHeader({ name, stack }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const initial = name.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.avatar} accessible={false}>
        <Text variant="title1" color="accent">
          {initial}
        </Text>
      </View>
      <View style={styles.texts}>
        <Text variant="display" accessibilityRole="header">
          {name}
        </Text>
        <Inline gap="xs" wrap>
          <Tag label={t('profile.level')} tone="accent" />
          {stack.map((item) => (
            <Tag key={item} label={item} />
          ))}
        </Inline>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.strong,
    boxShadow: shadows.glowAtmosphere,
  },
  texts: {
    gap: spacing.sm,
  },
});
