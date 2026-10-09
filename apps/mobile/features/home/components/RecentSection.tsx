import { Bookmark } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EmptyState } from '@/components/states';
import { Divider, ListItem, SectionHeader } from '@/components/ui';

import type { SavedAnswer } from '../types';

export function RecentSection({ items }: { items: SavedAnswer[] }) {
  const { t } = useTranslation();

  return (
    <View>
      <SectionHeader label={t('home.recent.label')} />
      {items.length === 0 ? (
        <EmptyState
          compact
          icon={Bookmark}
          title={t('home.recent.emptyTitle')}
          description={t('home.recent.emptyDescription')}
          testID="recent-empty"
        />
      ) : (
        items.map((item, index) => (
          <View key={item.id}>
            {index > 0 ? <Divider /> : null}
            <ListItem title={item.title} subtitle={item.savedAt} icon={Bookmark} />
          </View>
        ))
      )}
    </View>
  );
}
