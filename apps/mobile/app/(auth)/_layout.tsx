import { Stack } from 'expo-router';

import { colors } from '@/constants/tokens';

export default function AuthLayout() {
  return (
    <Stack
      initialRouteName="sign-in"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'fade',
      }}
    />
  );
}
