import {
  SelectControl,
  SelectOption,
} from '@comet/ui/components/select-control';
import { useEffect, useState, type ReactElement } from 'react';
import { Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@comet/ui/components/dialog';
import { locales, type Locale, type Theme } from '@comet/contracts';
import { Button } from '@comet/converter';
import { useApp } from './state';

const names: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Русский',
};

/**
 * Own preference interactions in desktop; shared UI has no persistence policy.
 */
export function Settings(): ReactElement | null {
  const { t } = useTranslation();
  const { preferences, environment, updatePreferences } = useApp();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('comet:settings', show);

    return () => window.removeEventListener('comet:settings', show);
  }, []);
  if (!preferences) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          icon
          variant="ghost"
          aria-label={t('ui.settings')}
          title={`${t('ui.settings')} · ⌘ / Ctrl + ,`}
        >
          <Settings2 size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent
        closeLabel={t('ui.dismiss')}
        className="preferences-dialog"
      >
        <DialogTitle>{t('ui.settings')}</DialogTitle>
        <DialogDescription>{t('design.preferencesHint')}</DialogDescription>
        <label className="inspector-field">
          {t('ui.language')}
          <SelectControl
            label={t('ui.language')}
            value={preferences.locale}
            onValueChange={(value) =>
              void updatePreferences((previous) => ({
                ...previous,
                locale: value as Locale,
              }))
            }
          >
            {locales.map((locale) => (
              <SelectOption key={locale} value={locale}>
                {names[locale]}
              </SelectOption>
            ))}
          </SelectControl>
        </label>
        <label className="inspector-field">
          {t('ui.theme')}
          <SelectControl
            label={t('ui.theme')}
            value={preferences.theme}
            onValueChange={(value) =>
              void updatePreferences((previous) => ({
                ...previous,
                theme: value as Theme,
              }))
            }
          >
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <SelectOption key={theme} value={theme}>
                {t(`ui.${theme}`)}
              </SelectOption>
            ))}
          </SelectControl>
        </label>
        <div className="preferences-footer">
          <span>{t('ui.version', { version: environment?.version })}</span>
          <Button onClick={() => setOpen(false)}>{t('ui.dismiss')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
