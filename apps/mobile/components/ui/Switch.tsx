import { Switch as RNSwitch } from 'react-native';

import { colors } from '@/constants/tokens';

type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
};

/** Native switch in system colors: platform-familiar and accessible out of the box. */
export function Switch({
  value,
  onValueChange,
  accessibilityLabel,
  disabled,
  testID,
}: SwitchProps) {
  return (
    <RNSwitch
      testID={testID}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: colors.border.strong, true: colors.accent.primary }}
      thumbColor={value ? colors.text.onAccent : colors.text.secondary}
      ios_backgroundColor={colors.border.strong}
    />
  );
}
