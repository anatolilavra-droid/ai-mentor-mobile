import { Stack } from 'expo-router';

import { colors } from '@/constants/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/states';

/** Code review flow: input → result, opened from Home or Chat (not a tab). */
export default function CodeReviewLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'slide_from_right',
      }}
    />
  );
}
