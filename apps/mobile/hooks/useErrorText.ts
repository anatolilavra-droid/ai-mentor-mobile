import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { TranslationKey } from '@/lib/i18n';

/**
 * Validation messages are translation keys (see *.schemas.ts).
 * Returns a function that turns one into display text.
 */
export function useErrorText(): (key: string | undefined | null) => string | undefined {
  const { t } = useTranslation();
  return useCallback((key) => (key ? t(key as TranslationKey) : undefined), [t]);
}
