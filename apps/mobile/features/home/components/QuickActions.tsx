import { router } from 'expo-router';
import { Bug, Code, Lightbulb } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Divider, ListItem, SectionHeader } from '@/components/ui';

export function QuickActions() {
  const { t } = useTranslation();
  const openChat = () => router.navigate('/chat');

  const actions = [
    { key: 'ask', icon: Lightbulb },
    { key: 'explain', icon: Code },
    { key: 'fix', icon: Bug },
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
            onPress={openChat}
            accessibilityHint={t('tabs.a11yHint', { label: t('tabs.chat') })}
          />
        </View>
      ))}
    </View>
  );
}
