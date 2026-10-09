import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useToastStore } from '@/stores/toast.store';

import { ProfileFormScreen } from './components/ProfileFormScreen';
import { toProfileFormDefaults } from './profile.schemas';
import { useCurrentProfile, useUpdateProfile } from './useProfile';

export function EditProfileScreen() {
  const { t } = useTranslation();
  const profile = useCurrentProfile();
  const { mutateAsync } = useUpdateProfile();
  const showToast = useToastStore((state) => state.show);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  return (
    <ProfileFormScreen
      testID="edit-profile-screen"
      eyebrow={t('profileEdit.eyebrow')}
      title={t('profileEdit.title')}
      submitLabel={t('profileEdit.submit')}
      submitIcon={Check}
      defaultValues={toProfileFormDefaults(profile)}
      onSubmit={async (values) => {
        await mutateAsync(values);
        haptics.success();
        showToast(t('profileEdit.saved'));
        close();
      }}
      secondaryAction={
        <Button label={t('common.cancel')} variant="ghost" size="md" fullWidth onPress={close} />
      }
    />
  );
}
