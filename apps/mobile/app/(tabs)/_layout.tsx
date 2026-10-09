import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { TabBar } from '@/components/navigation/TabBar';
import { tabConfig } from '@/constants/tabs';
import { colors } from '@/constants/tokens';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      backBehavior="firstRoute"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background.primary },
      }}
    >
      {tabConfig.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.labelKey) }} />
      ))}
    </Tabs>
  );
}
