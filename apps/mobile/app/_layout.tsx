import { useFonts } from 'expo-font';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { LogOut, Settings } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toast } from '@/components/feedback/Toast';
import {
  EmptyState,
  ErrorState,
  FullScreenState,
  LoadingState,
  RouteErrorBoundary,
} from '@/components/states';
import { Button } from '@/components/ui';
import { fontAssets } from '@/constants/fonts';
import { colors } from '@/constants/tokens';
import { signOut } from '@/features/auth/auth.service';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useAuth } from '@/features/auth/useAuth';
import { getOnboardingState } from '@/features/profile/profile.schemas';
import { useProfileQuery } from '@/features/profile/useProfile';
import { envResult } from '@/lib/env';
import { applyUiLanguage } from '@/lib/i18n';
import { QueryProvider } from '@/lib/query/QueryProvider';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';

export { RouteErrorBoundary as ErrorBoundary };

void SplashScreen.preventAutoHideAsync();
// Root view color shows during transitions and keyboard animations — keep it on-brand.
void SystemUI.setBackgroundColorAsync(colors.background.primary);

const stackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background.primary },
  animation: 'fade',
} as const;

/**
 * Decides what the user may see:
 * signed out → (auth);
 * signed in, onboarding pending → onboarding only;
 * signed in, onboarding completed or skipped → (tabs), profile editing, and
 * onboarding again ("Finish setup" / "Personalize your mentor").
 * The splash screen stays up until the stored session has been restored.
 */
function RootNavigator() {
  const { t } = useTranslation();
  const { status, user, isRecoveringPassword } = useAuth();
  const signedIn = status === 'signedIn' && !isRecoveringPassword;
  const profile = useProfileQuery(signedIn ? user?.id : undefined);
  const uiLanguage = profile.data?.ui_language;

  useEffect(() => {
    if (status !== 'initializing') void SplashScreen.hideAsync();
  }, [status]);

  useEffect(() => {
    if (uiLanguage) applyUiLanguage(uiLanguage);
  }, [uiLanguage]);

  if (!envResult.ok) {
    return (
      <FullScreenState testID="config-error">
        <EmptyState
          icon={Settings}
          title={t('common.config.title')}
          description={`${t('common.config.message')}\n${t('common.config.missing', { names: envResult.missing.join(', ') })}`}
        />
      </FullScreenState>
    );
  }

  if (status === 'initializing') return null;

  if (signedIn && profile.isPending) {
    return (
      <FullScreenState testID="profile-loading">
        <LoadingState label={t('common.loading')} blocks={2} />
      </FullScreenState>
    );
  }

  if (signedIn && profile.isError && !profile.data) {
    return (
      <FullScreenState testID="profile-load-error">
        <ErrorState
          title={t('common.profileError.title')}
          message={t('common.profileError.message')}
          onRetry={() => void profile.refetch()}
          testID="profile-load"
        />
        <Button
          label={t('auth.signOut.action')}
          leadingIcon={LogOut}
          variant="ghost"
          size="md"
          onPress={() => void signOut().catch(() => undefined)}
        />
      </FullScreenState>
    );
  }

  const appUnlocked = signedIn && getOnboardingState(profile.data) !== 'pending';

  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={appUnlocked}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="code-review" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fontsReady = fontsLoaded || !!fontError;

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <StatusBar style="light" />
              <NavigationBar style="light" />
              <RootNavigator />
              <Toast />
            </AuthProvider>
          </QueryProvider>
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
