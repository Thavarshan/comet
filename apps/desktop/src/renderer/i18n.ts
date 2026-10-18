import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { converterMessages as messages } from '@comet/converter';

void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    Object.entries(messages).map(([locale, translation]) => [
      locale,
      { translation },
    ]),
  ),
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'es', 'fr', 'de', 'ru'],
  interpolation: { escapeValue: false },
  initAsync: false,
});

export default i18n;
