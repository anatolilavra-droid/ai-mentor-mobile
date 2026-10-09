import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderWidths, colors, layout, safeArea, spacing } from '@/constants/tokens';

type ScreenProps = {
  children: ReactNode;
  /** Primary action area, pinned to the bottom (thumb zone) above the tab bar. */
  footer?: ReactNode;
  scroll?: boolean;
  /** Add the bottom safe-area inset. Only for screens without the tab bar. */
  withBottomInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function useScreenGutter(): number {
  const { width } = useWindowDimensions();
  return width < layout.compactWidth ? layout.gutterCompact : layout.gutter;
}

/**
 * Base screen: safe areas, gutters, keyboard-safe scrolling, and a pinned
 * footer for the screen's single primary action.
 */
export function Screen({
  children,
  footer,
  scroll = true,
  withBottomInset = false,
  contentStyle,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();
  const bottomInset = withBottomInset ? insets.bottom + safeArea.bottomExtra : 0;

  const content = [
    styles.content,
    {
      paddingTop: insets.top + safeArea.topExtra,
      paddingHorizontal: gutter,
      paddingBottom: footer ? spacing.md : spacing.xl + bottomInset,
    },
    contentStyle,
  ];

  return (
    <View testID={testID} style={styles.root}>
      {/* Edge-to-edge Android no longer resizes the window for the keyboard, so pad on both platforms. */}
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.root, content]}>{children}</View>
        )}
        {footer ? (
          <View
            style={[
              styles.footer,
              { paddingHorizontal: gutter, paddingBottom: spacing.sm + bottomInset },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  footer: {
    paddingTop: spacing.sm,
    backgroundColor: colors.background.primary,
    borderTopWidth: borderWidths.hairline,
    borderTopColor: colors.border.subtle,
  },
});
