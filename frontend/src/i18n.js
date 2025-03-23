import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import languageDetector from './languageDetector';
import { I18nManager } from 'react-native';

import en from './translations/en.json';
import ar from './translations/ar.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ar',
    resources,
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
  }, () => {
    // After initialization, enforce RTL if the language is Arabic.
    const currentLanguage = i18n.language;
    const isArabic = currentLanguage.toLowerCase().startsWith('ar');
    if (isArabic !== I18nManager.isRTL) {
      I18nManager.forceRTL(isArabic);
      // Note: Changing RTL requires a full app reload to take effect.
    }
  });

export default i18n;
