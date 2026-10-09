import { View, type ViewProps, type ViewStyle } from 'react-native';

import { spacing, type SpacingToken } from '@/constants/tokens';

type StackProps = ViewProps & {
  gap?: SpacingToken;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
};

function createStack(direction: 'row' | 'column') {
  return function StackLayout({ gap = 'none', align, justify, wrap, style, ...rest }: StackProps) {
    return (
      <View
        style={[
          {
            flexDirection: direction,
            gap: spacing[gap],
            alignItems: align,
            justifyContent: justify,
            flexWrap: wrap ? 'wrap' : 'nowrap',
          },
          style,
        ]}
        {...rest}
      />
    );
  };
}

/** Vertical layout with token-based gaps. */
export const Stack = createStack('column');
/** Horizontal layout with token-based gaps. */
export const Inline = createStack('row');
