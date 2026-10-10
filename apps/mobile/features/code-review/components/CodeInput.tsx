import {
  MAX_CODE_REVIEW_CHARS,
  MAX_CODE_REVIEW_LINES,
  type CodeInputCheck,
} from '@ai-mentor/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui';
import {
  borderWidths,
  colors,
  fontFamilies,
  fontSizes,
  lineHeights,
  opacity,
  radii,
  spacing,
} from '@/constants/tokens';

import { INPUT_ISSUE_KEYS } from '../codeReview.errors';

type CodeInputProps = {
  value: string;
  onChangeText: (code: string) => void;
  /** checkCodeInput(value): the same check the API runs. */
  check: CodeInputCheck;
  editable?: boolean;
};

/**
 * Monospaced code field with live character and line counters. The input is
 * never cut: limits are shown and enforced by the send button and the API.
 */
export function CodeInput({ value, onChangeText, check, editable = true }: CodeInputProps) {
  const { t, i18n } = useTranslation();
  const [focused, setFocused] = useState(false);
  const format = (count: number) => count.toLocaleString(i18n.language);

  const tooLong = check.issues.includes('tooManyChars') || check.issues.includes('tooManyLines');
  // "empty" only disables the button; a fresh screen shows no error.
  const errorIssue = check.issues.find((issue) => issue !== 'empty');
  const error = errorIssue
    ? t(INPUT_ISSUE_KEYS[errorIssue], {
        max: format(errorIssue === 'tooManyLines' ? MAX_CODE_REVIEW_LINES : MAX_CODE_REVIEW_CHARS),
      })
    : undefined;
  const counter = t('codeReview.counter', {
    chars: format(check.chars),
    maxChars: format(MAX_CODE_REVIEW_CHARS),
    lines: format(check.lines),
    maxLines: format(MAX_CODE_REVIEW_LINES),
  });

  const borderColor = error
    ? colors.status.error
    : focused
      ? colors.accent.primary
      : colors.border.subtle;

  return (
    <View style={styles.container}>
      <Text variant="caption" color="secondary">
        {t('codeReview.codeLabel')}
      </Text>
      <View style={[styles.field, { borderColor }, !editable && styles.disabled]}>
        <TextInput
          testID="code-review-input"
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          multiline
          scrollEnabled={false}
          // A cheap guard against huge pastes; the real limits are shown below.
          maxLength={MAX_CODE_REVIEW_CHARS * 2}
          placeholder={t('codeReview.codePlaceholder')}
          placeholderTextColor={colors.text.muted}
          selectionColor={colors.accent.primary}
          cursorColor={colors.accent.primary}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          importantForAutofill="no"
          textAlignVertical="top"
          accessibilityLabel={t('codeReview.codeLabel')}
          accessibilityHint={error ?? counter}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
      </View>
      <View style={styles.footer}>
        {error ? (
          <Text
            variant="caption"
            color="error"
            accessibilityLiveRegion="polite"
            style={styles.message}
            testID="code-review-input-error"
          >
            {error}
          </Text>
        ) : (
          <View style={styles.message} />
        )}
        <Text variant="caption" color={tooLong ? 'error' : 'muted'} testID="code-review-counter">
          {counter}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxs,
  },
  field: {
    borderRadius: radii.md,
    borderWidth: borderWidths.hairline,
    backgroundColor: colors.background.secondary,
    minHeight: spacing.huge * 3,
  },
  disabled: {
    opacity: opacity.muted,
  },
  input: {
    flex: 1,
    padding: spacing.sm,
    color: colors.text.primary,
    fontFamily: fontFamilies.monoRegular,
    fontSize: fontSizes.code,
    lineHeight: lineHeights.code,
  },
  footer: {
    gap: spacing.xxs,
  },
  message: {
    flexShrink: 1,
  },
});
