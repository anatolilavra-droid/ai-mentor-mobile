import { View } from 'react-native';

import { borderWidths, colors, spacing, type SpacingToken } from '@/constants/tokens';

export function Divider({ inset = 'none' }: { inset?: SpacingToken }) {
  return (
    <View
      accessible={false}
      style={{
        height: borderWidths.hairline,
        backgroundColor: colors.border.subtle,
        marginLeft: spacing[inset],
      }}
    />
  );
}
