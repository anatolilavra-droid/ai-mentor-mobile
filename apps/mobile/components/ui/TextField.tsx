import { Eye, EyeOff } from 'lucide-react-native';
import { useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import {
  borderWidths,
  colors,
  fontFamilies,
  fontSizes,
  layout,
  lineHeights,
  opacity,
  radii,
  spacing,
} from '@/constants/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  /** Already-translated error message. */
  error?: string;
  hint?: string;
  /** Password field with a show/hide toggle. */
  secure?: boolean;
  /** Show a character counter (requires maxLength). */
  showCounter?: boolean;
  ref?: Ref<TextInput>;
};

export function TextField({
  label,
  error,
  hint,
  secure = false,
  showCounter = false,
  multiline,
  value,
  maxLength,
  editable = true,
  onFocus,
  onBlur,
  ref,
  testID,
  ...inputProps
}: TextFieldProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error
    ? colors.status.error
    : focused
      ? colors.accent.primary
      : colors.border.subtle;

  return (
    <View style={styles.container}>
      <Text variant="caption" color="secondary" nativeID={testID ? `${testID}-label` : undefined}>
        {label}
      </Text>
      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          { borderColor },
          !editable && styles.fieldDisabled,
        ]}
      >
        <TextInput
          ref={ref}
          testID={testID}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          editable={editable}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={colors.text.muted}
          selectionColor={colors.accent.primary}
          cursorColor={colors.accent.primary}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          accessibilityState={{ disabled: !editable }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, multiline && styles.inputMultiline]}
          {...inputProps}
        />
        {secure ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('common.hidePassword') : t('common.showPassword')}
            hitSlop={spacing.xxs}
            style={styles.toggle}
          >
            <Icon icon={revealed ? EyeOff : Eye} size="md" color="muted" />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.footer}>
        {error ? (
          <Text
            variant="caption"
            color="error"
            accessibilityLiveRegion="polite"
            style={styles.message}
            testID={testID ? `${testID}-error` : undefined}
          >
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" color="muted" style={styles.message}>
            {hint}
          </Text>
        ) : (
          <View style={styles.message} />
        )}
        {showCounter && maxLength ? (
          <Text variant="caption" color="muted">
            {`${value?.length ?? 0}/${maxLength}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  field: {
    minHeight: layout.minTouchTarget + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    backgroundColor: colors.surface.default,
    paddingLeft: spacing.sm,
  },
  fieldMultiline: {
    alignItems: 'flex-start',
    minHeight: spacing.huge + spacing.xl,
  },
  fieldDisabled: {
    opacity: opacity.muted,
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    paddingRight: spacing.sm,
    color: colors.text.primary,
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.body,
  },
  inputMultiline: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    lineHeight: lineHeights.body,
    textAlignVertical: 'top',
  },
  toggle: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  message: {
    flex: 1,
  },
});
