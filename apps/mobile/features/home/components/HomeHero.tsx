import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useGreeting } from '@/hooks/useGreeting';

type PlainGreetingKey =
  | 'home.greetingPlain.morning'
  | 'home.greetingPlain.afternoon'
  | 'home.greetingPlain.evening'
  | 'home.greetingPlain.night';

/** Greets by name; without a name (onboarding skipped) the greeting stays plain. */
export function HomeHero({ firstName }: { firstName: string | null }) {
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
      title={
        firstName
          ? t(greetingKey, { name: firstName })
          : t(greetingKey.replace('home.greeting.', 'home.greetingPlain.') as PlainGreetingKey)
      }
      subtitle={t('home.subtitle')}
    />
  );
}
