import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/states';
import { Button, Divider, Inline, SectionHeader, Surface, Tag, Text } from '@/components/ui';
import { spacing } from '@/constants/tokens';
import { useUserId } from '@/features/auth/useAuth';
import {
  useTechnologiesQuery,
  useUserTechnologiesQuery,
} from '@/features/onboarding/useOnboarding';

import type { Profile } from '../profile.schemas';

/** Current personalization answers and the entry point to change them. */
export function PersonalizationSection({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const userId = useUserId();
  const userTechnologies = useUserTechnologiesQuery(userId);
  const catalog = useTechnologiesQuery();

  const nameFor = (id: string) => catalog.data?.find((item) => item.id === id)?.name ?? id;
  const notSet = t('profile.notSet');

  return (
    <View testID="personalization-section">
      <SectionHeader label={t('profile.personalization')} />
      <Surface radius="lg">
        <Row
          label={t('onboarding.summary.rows.experience')}
          value={
            profile.experience_level ? t(`profileForm.levels.${profile.experience_level}`) : notSet
          }
        />
        <Divider />
        <Row
          label={t('onboarding.summary.rows.goal')}
          value={
            profile.primary_goal ? t(`onboarding.goal.options.${profile.primary_goal}`) : notSet
          }
        />
        {profile.custom_goal_details ? (
          <Text variant="callout" color="secondary" style={styles.details}>
            {profile.custom_goal_details}
          </Text>
        ) : null}
        <Divider />
        <View style={styles.row}>
          <Text variant="label" color="muted">
            {t('onboarding.summary.rows.technologies')}
          </Text>
          {userTechnologies.isPending ? (
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={t('profile.technologiesLoading')}
            >
              <Inline gap="xs">
                <Skeleton width={72} height={spacing.lg} radius="full" />
                <Skeleton width={96} height={spacing.lg} radius="full" />
              </Inline>
            </View>
          ) : userTechnologies.isError ? (
            <Text variant="callout" color="error" testID="personalization-tech-error">
              {t('profile.technologiesError')}
            </Text>
          ) : userTechnologies.data.length === 0 ? (
            <Text variant="callout" color="muted">
              {notSet}
            </Text>
          ) : (
            <Inline gap="xs" wrap>
              {userTechnologies.data.map((id) => (
                <Tag key={id} label={nameFor(id)} tone="accent" />
              ))}
            </Inline>
          )}
        </View>
      </Surface>
      <View style={styles.action}>
        <Button
          label={t('profile.personalize')}
          leadingIcon={Sparkles}
          variant="secondary"
          size="md"
          fullWidth
          onPress={() => router.push('/onboarding')}
          accessibilityHint={t('profile.personalizeHint')}
          testID="personalize-mentor"
        />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="label" color="muted">
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
  },
  details: {
    paddingBottom: spacing.sm,
  },
  action: {
    paddingTop: spacing.sm,
  },
});
