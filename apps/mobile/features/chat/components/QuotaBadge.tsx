import type { UsageFeature } from '@ai-mentor/shared';
import { useTranslation } from 'react-i18next';

import { Tag } from '@/components/ui';

import { useUsage } from '../useChat';

/** "3 / 30 this month" for one AI feature. Hidden until the usage is known. */
export function QuotaBadge({ feature = 'chat' }: { feature?: UsageFeature }) {
  const { t } = useTranslation();
  const usage = useUsage();
  if (!usage.data) return null;
  const { used, limit } = usage.data.features[feature];
  return (
    <Tag label={t('chat.quota', { used, limit })} tone={used >= limit ? 'neutral' : 'accent'} />
  );
}
