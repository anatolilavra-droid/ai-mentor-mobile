import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AsyncView, LoadingState } from '@/components/states';
import { Button } from '@/components/ui';
import { spacing } from '@/constants/tokens';
import { useCurrentProfile } from '@/features/profile/useProfile';
import { useAsyncResource } from '@/hooks/useAsyncResource';

import { ConceptPreview } from './components/ConceptPreview';
import { HomeHero } from './components/HomeHero';
import { NextStepCard } from './components/NextStepCard';
import { QuickActions } from './components/QuickActions';
import { RecentSection } from './components/RecentSection';
import { getHomeSummary } from './data/getHomeSummary';
import type { HomeSummary } from './types';

type HomeScreenProps = {
  /** Injectable for tests; defaults to the local mock data source. */
  loadSummary?: () => Promise<HomeSummary>;
};

export function HomeScreen({ loadSummary = getHomeSummary }: HomeScreenProps) {
  const { t } = useTranslation();
  const profile = useCurrentProfile();
  const { state, retry } = useAsyncResource(loadSummary);

  return (
    <Screen
      testID="home-screen"
      footer={
        <Button
          label={t('home.primaryAction')}
          trailingIcon={ArrowRight}
          fullWidth
          disabled={state.status !== 'success'}
          onPress={() => router.navigate('/learn')}
          accessibilityHint={t('tabs.a11yHint', { label: t('tabs.learn') })}
          testID="home-primary-action"
        />
      }
    >
      <AsyncView
        state={state}
        onRetry={retry}
        testID="home"
        loading={<LoadingState label={t('home.loadingLabel')} blocks={3} testID="home-loading" />}
      >
        {(summary) => (
          <View style={{ gap: spacing.xl }}>
            <View>
              <HomeHero firstName={profile.display_name ?? ''} />
              <NextStepCard step={summary.nextStep} />
            </View>
            <QuickActions />
            <ConceptPreview concept={summary.concept} />
            <RecentSection items={summary.savedAnswers} />
          </View>
        )}
      </AsyncView>
    </Screen>
  );
}
