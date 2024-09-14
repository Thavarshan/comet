import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Locale } from '@/enum/locale';

/**
 * A composable function to manage the language preferences of the application.
 *
 * @returns An object with the current locale and a function to set it.
 */
export function useLanguagePreferences() {
  const { locale } = useI18n();
  const storedLocale = localStorage.getItem('locale') || Locale.EN;
  const currentLocale = ref(storedLocale);

  const setLocale = (newLocale: string) => {
    currentLocale.value = newLocale;
    locale.value = newLocale;
    localStorage.setItem('locale', newLocale);
  };

  watch(currentLocale, (newLocale) => {
    locale.value = newLocale;
    localStorage.setItem('locale', newLocale);
  });

  return {
    currentLocale,
    setLocale,
  };
}
