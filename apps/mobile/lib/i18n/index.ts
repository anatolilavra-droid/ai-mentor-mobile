import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

export const resources = {
  en: { translation: en },
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
