import Constants from 'expo-constants';
import { Globe, Info, MoonStar, PenLine, Smartphone, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ListItem, Switch, Tag } from '@/components/ui';
import { spacing } from '@/constants/tokens';
import { ComingSoonFooter } from '@/features/shared/ComingSoonFooter';
import { haptics } from '@/lib/haptics';
import { usePreferencesStore } from '@/stores/preferences.store';
import { useToastStore } from '@/stores/toast.store';

import { ProfileHeader } from './components/ProfileHeader';
import { SettingsSection } from './components/SettingsSection';
import { profileMock } from './profile.mock';

export function ProfileScreen() {
  const { t } = useTranslation();
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = usePreferencesStore((state) => state.setHapticsEnabled);
  const showToast = useToastStore((state) => state.show);
  const version = Constants.expoConfig?.version ?? '—';

  const onToggleHaptics = (enabled: boolean) => {
    setHapticsEnabled(enabled);
    haptics.success();
    showToast(t('profile.saved'));
  };

  return (
    <Screen
      testID="profile-screen"
      footer={<ComingSoonFooter label={t('profile.primaryAction')} icon={PenLine} />}
    >
      <ProfileHeader name={profileMock.name} stack={profileMock.stack} />

      <View style={{ gap: spacing.lg }}>
        <SettingsSection title={t('profile.preferences')}>
          <ListItem
            icon={Globe}
            title={t('profile.language')}
            subtitle={t('profile.languageHint')}
            value={t('profile.languageValue')}
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
      </View>
    </Screen>
  );
}
