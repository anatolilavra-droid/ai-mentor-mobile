import { router } from 'expo-router';
import { Bug, Code, Lightbulb } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Divider, ListItem, SectionHeader } from '@/components/ui';

export function QuickActions() {
  const { t } = useTranslation();

  // "Ask" opens the chat; "explain" and "fix" open the code review flow with that action.
  const actions = [
    {
      key: 'ask',
      icon: Lightbulb,
      onPress: () => router.navigate('/chat'),
      hint: t('tabs.a11yHint', { label: t('tabs.chat') }),
    },
    {
      key: 'explain',
      icon: Code,
      onPress: () => router.push('/code-review?action=explain'),
      hint: t('codeReview.openHint'),
    },
    {
      key: 'fix',
      icon: Bug,
      onPress: () => router.push('/code-review?action=fix'),
      hint: t('codeReview.openHint'),
    },
  ] as const;

  return (
    <View>
      <SectionHeader label={t('home.quickActions.label')} />
      {actions.map((action, index) => (
        <View key={action.key}>
          {index > 0 ? <Divider inset="xxxl" /> : null}
          <ListItem
            testID={`quick-action-${action.key}`}
            icon={action.icon}
            title={t(`home.quickActions.${action.key}.title`)}
            subtitle={t(`home.quickActions.${action.key}.subtitle`)}
            onPress={action.onPress}
            accessibilityHint={action.hint}
          />
        </View>
      ))}
    </View>
  );
}
