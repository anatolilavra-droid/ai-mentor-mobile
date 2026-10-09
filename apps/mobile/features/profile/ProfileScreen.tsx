import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Globe, Info, LogOut, MoonStar, PenLine, Smartphone, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Screen } from '@/components/layout/Screen';
import { Button, ListItem, Switch, Tag } from '@/components/ui';
import { spacing } from '@/constants/tokens';
import { toAuthActionError } from '@/features/auth/auth.errors';
import { signOut } from '@/features/auth/auth.service';
import { useAuth } from '@/features/auth/useAuth';
import { haptics } from '@/lib/haptics';
import type { TranslationKey } from '@/lib/i18n';
import { usePreferencesStore } from '@/stores/preferences.store';
import { useToastStore } from '@/stores/toast.store';

import { PersonalizationSection } from './components/PersonalizationSection';
import { ProfileHeader } from './components/ProfileHeader';
import { SettingsSection } from './components/SettingsSection';
import { useCurrentProfile } from './useProfile';

export function ProfileScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const profile = useCurrentProfile();
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = usePreferencesStore((state) => state.setHapticsEnabled);
  const showToast = useToastStore((state) => state.show);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<TranslationKey | null>(null);
  const version = Constants.expoConfig?.version ?? '—';

  const onToggleHaptics = (enabled: boolean) => {
    setHapticsEnabled(enabled);
    haptics.success();
    showToast(t('profile.saved'));
  };

  const performSignOut = async () => {
    setSignOutError(null);
    setSigningOut(true);
    try {
      await signOut();
      showToast(t('auth.signOut.done'));
      // The auth guard returns the user to sign in.
    } catch (error) {
      setSignOutError(toAuthActionError(error).messageKey);
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(t('auth.signOut.confirmTitle'), t('auth.signOut.confirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.signOut.action'), style: 'destructive', onPress: performSignOut },
    ]);
  };

  return (
    <Screen
      testID="profile-screen"
      footer={
        <Button
          label={t('profile.primaryAction')}
          leadingIcon={PenLine}
          fullWidth
          onPress={() => router.push('/profile-edit')}
          testID="profile-edit-action"
        />
      }
    >
      <ProfileHeader profile={profile} email={user?.email} />

      <View style={{ gap: spacing.lg }}>
        <PersonalizationSection profile={profile} />

        <SettingsSection title={t('profile.preferences')}>
          <ListItem
            icon={Globe}
            title={t('profile.language')}
            value={t(`profileForm.languages.${profile.ui_language}`)}
          />
          <ListItem
            icon={Smartphone}
            title={t('profile.haptics')}
            subtitle={t('profile.hapticsHint')}
            trailing={
              <Switch
                value={hapticsEnabled}
                onValueChange={onToggleHaptics}
                accessibilityLabel={t('profile.haptics')}
                testID="haptics-switch"
              />
            }
          />
          <ListItem
            icon={MoonStar}
            title={t('profile.appearance')}
            value={t('profile.appearanceValue')}
          />
        </SettingsSection>

        <SettingsSection title={t('profile.about')}>
          <ListItem icon={Info} title={t('profile.version')} value={version} />
          <ListItem
            icon={Sparkles}
            title={t('profile.plan')}
            trailing={<Tag label={t('profile.planFree')} tone="violet" />}
          />
        </SettingsSection>

        <SettingsSection title={t('profile.account')}>
          <ListItem
            icon={LogOut}
            title={t('auth.signOut.action')}
            onPress={signingOut ? undefined : confirmSignOut}
            disabled={signingOut}
            testID="sign-out"
          />
        </SettingsSection>
        {signOutError ? (
          <InlineMessage tone="error" message={t(signOutError)} testID="sign-out-error" />
        ) : null}
      </View>
    </Screen>
  );
}
