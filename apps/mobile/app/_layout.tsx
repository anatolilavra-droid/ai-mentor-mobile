import '@/lib/i18n';

import { useFonts } from 'expo-font';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toast } from '@/components/feedback/Toast';
import { RouteErrorBoundary } from '@/components/states';
import { fontAssets } from '@/constants/fonts';
import { colors } from '@/constants/tokens';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';

export { RouteErrorBoundary as ErrorBoundary };

void SplashScreen.preventAutoHideAsync();
// Root view color shows during transitions and keyboard animations — keep it on-brand.
void SystemUI.setBackgroundColorAsync(colors.background.primary);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="light" />
          <NavigationBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background.primary },
              animation: 'fade',
            }}
          />
          <Toast />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});
