import { ArrowRight } from 'lucide-react-native';

import { Button, Stack, Text } from '@/components/ui';

type ContinueFooterProps = {
  label: string;
  onPress: () => void;
  disabled: boolean;
  /** Explains why Continue is disabled, or what the limit is. */
  hint?: string;
};

export function ContinueFooter({ label, onPress, disabled, hint }: ContinueFooterProps) {
  return (
    <Stack gap="xs">
      <Button
        label={label}
        trailingIcon={ArrowRight}
        onPress={onPress}
        disabled={disabled}
        fullWidth
        accessibilityHint={disabled ? hint : undefined}
        testID="onboarding-continue"
      />
      {hint ? (
        <Text
          variant="caption"
          color="muted"
          align="center"
          accessibilityLiveRegion="polite"
          testID="onboarding-continue-hint"
        >
          {hint}
        </Text>
      ) : null}
    </Stack>
  );
}
