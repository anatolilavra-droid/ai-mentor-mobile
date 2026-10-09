import { Stack } from 'expo-router';

import { colors } from '@/constants/tokens';
import { OnboardingFlowProvider } from '@/features/onboarding/OnboardingFlow';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/states';

export default function OnboardingLayout() {
  return (
    <OnboardingFlowProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
          animation: 'slide_from_right',
        }}
      />
    </OnboardingFlowProvider>
  );
}
