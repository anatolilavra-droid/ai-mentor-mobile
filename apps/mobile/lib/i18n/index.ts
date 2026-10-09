import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import ru from './locales/ru.json';

export const resources = {
  en: { translation: en },
  ru: { translation: ru },
  de: { translation: de },
} as const;

export type SupportedLanguage = keyof typeof resources;

function resolveLanguage(): SupportedLanguage {
  const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
  return deviceLanguage in resources ? (deviceLanguage as SupportedLanguage) : 'en';
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: resolveLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    // Resources are bundled, so initialise synchronously: no flash of raw keys.
    initAsync: false,
  });
}

export default i18n;

export type TranslationKey = import('i18next').ParseKeys;

/** Switch the interface language; unknown codes fall back to English. */
export function applyUiLanguage(language: string): void {
  const target = language in resources ? language : 'en';
  if (i18n.language !== target) void i18n.changeLanguage(target);
}

/** Interface language for a new account: the device language when supported, else English. */
export function deviceUiLanguage(): 'ru' | 'en' | 'de' {
  const code = getLocales()[0]?.languageCode;
  return code === 'ru' || code === 'de' ? code : 'en';
}
