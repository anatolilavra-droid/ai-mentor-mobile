import { StyleSheet, View } from 'react-native';

import { borderWidths, colors, layout, radii, spacing } from '@/constants/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ChoiceOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
};

type ChoiceGroupProps<T extends string | number> = {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  /** Already-translated error message. */
  error?: string;
  hint?: string;
  /** "list" shows full-width rows with descriptions; "chips" wraps compact pills. */
  layout?: 'list' | 'chips';
  testID?: string;
};

/** Single-choice group exposed to assistive tech as a radio group. */
export function ChoiceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  error,
  hint,
  layout: variant = 'chips',
  testID,
}: ChoiceGroupProps<T>) {
  return (
    <View style={styles.container} testID={testID}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={variant === 'chips' ? styles.chips : styles.list}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <PressableScale
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={
                option.description ? `${option.label}, ${option.description}` : option.label
              }
              onPress={() => onChange(option.value)}
              haptic
              testID={testID ? `${testID}-${String(option.value)}` : undefined}
              style={[
                variant === 'chips' ? styles.chip : styles.row,
                selected ? styles.selected : styles.unselected,
              ]}
            >
              <Text variant="bodyMedium" color={selected ? 'accent' : 'primary'}>
                {option.label}
              </Text>
              {variant === 'list' && option.description ? (
                <Text variant="callout" color="muted">
                  {option.description}
                </Text>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
      {error ? (
        <Text variant="caption" color="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  list: {
    gap: spacing.xs,
  },
  chip: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    borderWidth: borderWidths.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: layout.minTouchTarget + spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  selected: {
    backgroundColor: colors.accent.primarySoft,
    borderColor: colors.accent.primary,
  },
  unselected: {
    backgroundColor: colors.surface.default,
    borderColor: colors.border.subtle,
  },
});
