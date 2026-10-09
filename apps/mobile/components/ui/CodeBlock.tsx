import { ScrollView, StyleSheet, View } from 'react-native';

import { borderWidths, colors, radii, spacing } from '@/constants/tokens';

import { Text } from './Text';

type CodeBlockProps = {
  code: string;
  language: string;
};

/** Monospaced, horizontally scrollable code — never wraps, so indentation stays honest. */
export function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="label" color="muted">
          {language}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.code}
        accessibilityLabel={`${language} code`}
      >
        <Text variant="code" color="secondary" selectable>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.md,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.secondary,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  code: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
});
