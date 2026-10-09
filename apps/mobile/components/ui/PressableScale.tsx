import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion, opacity } from '@/constants/tokens';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { haptics } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Fire a light haptic on press. */
  haptic?: boolean;
};

/** Pressable with a restrained spring scale; static when reduce motion is on. */
export function PressableScale({
  style,
  haptic = false,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  accessibilityRole = 'button',
  ...rest
}: PressableScaleProps) {
  const { reduceMotion } = useMotionPreference();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={(event) => {
        if (!reduceMotion) scale.set(withSpring(motion.pressScale, motion.springs.press));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(reduceMotion ? 1 : withSpring(1, motion.springs.press));
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic) haptics.press();
        onPress?.(event);
      }}
      style={[style, animatedStyle, disabled && { opacity: opacity.disabled }]}
      {...rest}
    />
  );
}
