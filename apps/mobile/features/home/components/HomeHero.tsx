import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useGreeting } from '@/hooks/useGreeting';

export function HomeHero({ firstName }: { firstName: string }) {
  const { t, i18n } = useTranslation();
  const greetingKey = useGreeting();
  const date = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  return (
    <ScreenHeader
      eyebrow={t('home.eyebrow', { date })}
      title={t(greetingKey, { name: firstName })}
      subtitle={t('home.subtitle')}
    />
  );
}
