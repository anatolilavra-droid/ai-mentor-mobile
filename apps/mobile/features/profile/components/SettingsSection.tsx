import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

import { Divider, SectionHeader, Surface } from '@/components/ui';

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const items = Children.toArray(children);

  return (
    <View>
      <SectionHeader label={title} />
      <Surface padding="sm" radius="lg">
        {items.map((child, index) => (
          <View key={index}>
            {index > 0 ? <Divider /> : null}
            {child}
          </View>
        ))}
      </Surface>
    </View>
  );
}
