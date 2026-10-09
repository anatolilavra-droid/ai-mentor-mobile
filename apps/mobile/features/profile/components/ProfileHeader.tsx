import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Inline, Tag, Text } from '@/components/ui';
import { borderWidths, colors, radii, shadows, spacing } from '@/constants/tokens';

import type { Profile } from '../profile.schemas';

const AVATAR_SIZE = spacing.huge;

export function ProfileHeader({ profile, email }: { profile: Profile; email: string | undefined }) {
  const { t } = useTranslation();
  const name = profile.display_name ?? '';
  const initial = name.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.avatar} accessible={false}>
        <Text variant="title1" color="accent">
          {initial}
        </Text>
      </View>
      <View style={styles.texts}>
        <Text variant="display" accessibilityRole="header" testID="profile-name">
          {name}
        </Text>
        {email ? (
          <Text variant="callout" color="secondary" numberOfLines={1}>
            {email}
          </Text>
        ) : null}
        <Inline gap="xs" wrap>
          {profile.experience_level ? (
            <Tag label={t(`profileForm.levels.${profile.experience_level}`)} tone="accent" />
          ) : null}
          {profile.daily_minutes ? (
            <Tag label={t('profile.dailyMinutesValue', { count: profile.daily_minutes })} />
          ) : null}
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
