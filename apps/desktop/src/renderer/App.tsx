import { useEffect, useState, type ReactElement } from 'react';
import { CircleAlert, LoaderCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ConverterProvider,
  ConverterWorkspace,
} from '@comet/converter';
import { Alert, AlertTitle } from '@comet/ui/components/alert';
import { Disclosure } from '@comet/ui/components/disclosure';
import { TooltipProvider } from '@comet/ui/components/tooltip';
import { DesktopTitlebar } from './DesktopTitlebar';
import { Settings } from './Settings';
import { DesktopConverterPlatform } from './converter-platform';
import { useApp } from './state';

/** Desktop owns window chrome, bootstrap, persistence, and native settings. */
export function App(): ReactElement {
  const { t } = useTranslation();
  const { phase, error, retry, dismiss, preferences, updatePreferences } =
    useApp();
  const [platform] = useState(() => new DesktopConverterPlatform(window.comet));
  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key === ','
      ) {
        event.preventDefault();
        window.dispatchEvent(new Event('comet:settings'));
      }
    };

    window.addEventListener('keydown', shortcuts);

    return () => window.removeEventListener('keydown', shortcuts);
  }, []);
  if (phase === 'loading') {
    return (
      <main className="app-shell">
        <DesktopTitlebar />
        <section className="startup" role="status">
          <LoaderCircle size={28} className="spin" />
          <p>{t('ui.startup')}</p>
        </section>
      </main>
    );
  }

  if (phase === 'error' || !preferences) {
    return (
      <main className="app-shell">
        <DesktopTitlebar />
        <section className="startup">
          <CircleAlert size={32} />
          <h2>{t('ui.startupError')}</h2>
          <p>{error}</p>
          <Button onClick={retry}>{t('ui.retryStartup')}</Button>
        </section>
      </main>
    );
  }

  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={150}>
      <main className="app-shell">
        <DesktopTitlebar />
        <ConverterProvider
          platform={platform}
          preferences={platform.preferences(preferences)}
          onPreferencesChange={(next) =>
            updatePreferences((previous) =>
              platform.applyPreferences(previous, next),
            )
          }
        >
          <ConverterWorkspace toolbar={<Settings />} />
        </ConverterProvider>
        {error ? (
          <Alert className="error-banner" variant="destructive">
            <div>
              <AlertTitle>{t('ui.commandError')}</AlertTitle>
              <Disclosure label={t('ui.details')}>
                <p>{error}</p>
              </Disclosure>
            </div>
            <Button
              icon
              variant="ghost"
              aria-label={t('ui.dismiss')}
              onClick={dismiss}
            >
              <X size={17} />
            </Button>
          </Alert>
        ) : null}
      </main>
    </TooltipProvider>
  );
}
