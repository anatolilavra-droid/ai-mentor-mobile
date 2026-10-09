import { View } from 'react-native';

import { borderWidths, colors, radii, spacing } from '@/constants/tokens';

import { Text } from './Text';

type TagTone = 'neutral' | 'accent' | 'violet';

const tones = {
  neutral: {
    backgroundColor: 'transparent',
    borderColor: colors.border.strong,
    text: 'secondary',
  },
  accent: {
    backgroundColor: colors.accent.primarySoft,
    borderColor: 'transparent',
    text: 'accent',
  },
  violet: {
    backgroundColor: colors.accent.secondarySoft,
    borderColor: 'transparent',
    text: 'accentSecondary',
  },
} as const;

export function Tag({ label, tone = 'neutral' }: { label: string; tone?: TagTone }) {
  const style = tones[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xxs,
        borderRadius: radii.full,
        borderWidth: borderWidths.hairline,
        borderColor: style.borderColor,
        backgroundColor: style.backgroundColor,
      }}
    >
      <Text variant="label" color={style.text}>
        {label}
      </Text>
    </View>
  );
}
