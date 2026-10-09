import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon, Text } from '@/components/ui';
import { tabConfig } from '@/constants/tabs';
import {
  borderWidths,
  colors,
  layout,
  lineHeights,
  motion,
  radii,
  shadows,
  spacing,
} from '@/constants/tokens';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { haptics } from '@/lib/haptics';

const INDICATOR_WIDTH = layout.minTouchTarget + spacing.xs;
const INDICATOR_HEIGHT = spacing.lg;
/** Vertically aligns the capsule with the icon slot of the centered tab content. */
const INDICATOR_TOP =
  (layout.tabBarHeight - (INDICATOR_HEIGHT + spacing.xxs + lineHeights.label)) / 2;

/**
 * Custom bottom tab bar: hairline surface, mono labels, and one accent
 * capsule that glides to the active tab.
 */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { reduceMotion } = useMotionPreference();
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth / Math.max(state.routes.length, 1);
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (!tabWidth) return;
    const target = state.index * tabWidth + (tabWidth - INDICATOR_WIDTH) / 2;
    indicatorX.set(reduceMotion ? target : withSpring(target, motion.springs.indicator));
  }, [indicatorX, reduceMotion, state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.get() }],
  }));

  const onLayout = (event: LayoutChangeEvent) => setBarWidth(event.nativeEvent.layout.width);

  return (
    <View
      style={[styles.bar, { paddingBottom: insets.bottom }]}
      accessibilityRole="tablist"
      testID="tab-bar"
    >
      <View style={styles.row} onLayout={onLayout}>
        {tabWidth > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
        ) : null}

        {state.routes.map((route, index) => {
          const config = tabConfig.find((tab) => tab.name === route.name);
          if (!config) return null;
          const focused = state.index === index;
          const label = t(config.labelKey);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              haptics.selection();
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              testID={`tab-${route.name}`}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              <View style={styles.iconSlot}>
                <Icon icon={config.icon} size="md" color={focused ? 'accent' : 'muted'} />
              </View>
              <Text variant="label" color={focused ? 'primary' : 'muted'} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.background.secondary,
    borderTopWidth: borderWidths.hairline,
    borderTopColor: colors.border.subtle,
  },
  row: {
    height: layout.tabBarHeight,
    flexDirection: 'row',
  },
  indicator: {
    position: 'absolute',
    top: INDICATOR_TOP,
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    borderRadius: radii.full,
    backgroundColor: colors.accent.primarySoft,
    boxShadow: shadows.glowPrimarySubtle,
  },
  tab: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  iconSlot: {
    height: INDICATOR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
