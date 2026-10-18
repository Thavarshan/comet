import { Alert, AlertTitle } from '@comet/ui/components/alert';
import { Disclosure } from '@comet/ui/components/disclosure';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@comet/ui/components/tabs';
import { TooltipProvider } from '@comet/ui/components/tooltip';
import {
  CircleAlert,
  FileAudio,
  FileImage,
  FileVideo,
  LoaderCircle,
  X,
} from 'lucide-react';
import { mediaTypes, type MediaType } from '@comet/contracts';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { ConverterPanel } from './ConverterPanel';
import { Settings } from './Settings';
import { DesktopTitlebar } from './DesktopTitlebar';
import { useApp } from './state';

const icons = { video: FileVideo, audio: FileAudio, image: FileImage };

/**
 * Render startup recovery and media tabs around the shared queue.
 */
export function App(): ReactElement {
  const { t } = useTranslation();
  const { phase, error, retry, dismiss, queue } = useApp();
  const [media, setMedia] = useState<MediaType>('video');
  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }

      if (event.key.toLowerCase() === 'o') {
        event.preventDefault();
        window.dispatchEvent(new Event('comet:add-files'));
      } else if (event.key === ',') {
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

  if (phase === 'error') {
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
        <Tabs
          className="tabs"
          value={media}
          onValueChange={(value) => setMedia(value as MediaType)}
        >
          <div className="desktop-toolbar">
            <TabsList className="tab-list" aria-label={t('ui.queue')}>
              {mediaTypes.map((type) => {
                const Icon = icons[type];

                return (
                  <TabsTrigger
                    className="tab"
                    key={type}
                    value={type}
                    aria-label={t(`media.${type}`)}
                  >
                    <Icon size={16} />
                    {t(`media.${type}`)}
                    {!!queue.jobs.filter(
                      (job) =>
                        job.mediaType === type &&
                        !['succeeded', 'failed', 'canceled'].includes(
                          job.state,
                        ),
                    ).length && (
                      <span className="tab-count">
                        {
                          queue.jobs.filter(
                            (job) =>
                              job.mediaType === type &&
                              !['succeeded', 'failed', 'canceled'].includes(
                                job.state,
                              ),
                          ).length
                        }
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <Settings />
          </div>
          {mediaTypes.map((type) => (
            <TabsContent
              className="tab-content"
              key={type}
              value={type}
              forceMount
              hidden={media !== type}
            >
              <ConverterPanel media={type} active={media === type} />
            </TabsContent>
          ))}
        </Tabs>
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
