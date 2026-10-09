import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, PressableScale, Text } from '@/components/ui';
import { borderWidths, colors, layout, opacity, radii, spacing } from '@/constants/tokens';
import type { TechnologyCategory } from '@/types/database';

import type { Technology } from '../technologies.service';

const CATEGORY_ORDER: readonly TechnologyCategory[] = ['language', 'frontend', 'backend', 'tools'];

type TechnologyPickerProps = {
  technologies: readonly Technology[];
  selected: readonly string[];
  onChange: (selected: string[]) => void;
  max: number;
};

/**
 * Multi-select chips grouped by category. Tapping a selected chip removes it,
 * so a technology can never be picked twice. At the limit, unselected chips
 * are disabled (the screen explains why).
 */
export function TechnologyPicker({ technologies, selected, onChange, max }: TechnologyPickerProps) {
  const { t } = useTranslation();
  const atLimit = selected.length >= max;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
    } else if (!atLimit) {
      onChange([...selected, id]);
    }
  };

  return (
    <View style={styles.groups}>
      {CATEGORY_ORDER.map((category) => {
        const items = technologies.filter((technology) => technology.category === category);
        if (items.length === 0) return null;
        return (
          <View key={category} style={styles.group}>
            <Text variant="label" color="muted" accessibilityRole="header">
              {t(`onboarding.technologies.categories.${category}`)}
            </Text>
            <View style={styles.chips}>
              {items.map((technology) => {
                const isSelected = selected.includes(technology.id);
                const disabled = !isSelected && atLimit;
                return (
                  <PressableScale
                    key={technology.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={technology.name}
                    accessibilityState={{ checked: isSelected, disabled }}
                    disabled={disabled}
                    haptic
                    onPress={() => toggle(technology.id)}
                    testID={`technology-${technology.id}`}
                    style={[
                      styles.chip,
                      isSelected ? styles.chipSelected : styles.chipIdle,
                      disabled && styles.chipDisabled,
                    ]}
                  >
                    {isSelected ? <Icon icon={Check} size="sm" color="accent" /> : null}
                    <Text variant="bodyMedium" color={isSelected ? 'accent' : 'primary'}>
                      {technology.name}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  groups: {
    gap: spacing.md,
  },
  group: {
    gap: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    borderWidth: borderWidths.thin,
  },
  chipIdle: {
    backgroundColor: colors.surface.default,
    borderColor: colors.border.subtle,
  },
  chipSelected: {
    backgroundColor: colors.accent.primarySoft,
    borderColor: colors.accent.primary,
  },
  chipDisabled: {
    opacity: opacity.disabled,
  },
});
