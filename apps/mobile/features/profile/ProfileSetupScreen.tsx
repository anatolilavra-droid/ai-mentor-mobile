import { ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { ProfileFormScreen } from './components/ProfileFormScreen';
import { toProfileFormDefaults } from './profile.schemas';
import { useCurrentProfile, useUpdateProfile } from './useProfile';

/** First-time setup. Saving completes the profile, and the guard opens the app. */
export function ProfileSetupScreen() {
  const { t } = useTranslation();
  const profile = useCurrentProfile();
  const { mutateAsync } = useUpdateProfile();

  return (
    <ProfileFormScreen
      testID="profile-setup-screen"
      eyebrow={t('onboarding.eyebrow')}
      title={t('onboarding.title')}
      subtitle={t('onboarding.subtitle')}
      submitLabel={t('onboarding.submit')}
      submitIcon={ArrowRight}
      defaultValues={toProfileFormDefaults(profile)}
      onSubmit={async (values) => {
        await mutateAsync(values);
      }}
    />
  );
}
