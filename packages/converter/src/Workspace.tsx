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
import { Button } from './Button.js';
import { ConverterPanel } from './ConverterPanel';
import { useConverter } from './state.js';
import type { ReactNode } from 'react';

const icons = { video: FileVideo, audio: FileAudio, image: FileImage };

/**
 * Render startup recovery and media tabs around the shared queue.
 */
export function ConverterWorkspace({
  toolbar,
}: {
  toolbar?: ReactNode;
}): ReactElement {
  const { t } = useTranslation();
  const { phase, error, retry, dismiss, queue, platform } = useConverter();
  const supportedMedia = platform.mediaTypes ?? mediaTypes;
  const [media, setMedia] = useState<MediaType>(supportedMedia[0] ?? 'image');
  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }

      if (event.key.toLowerCase() === 'o') {
        event.preventDefault();
        window.dispatchEvent(new Event('comet:add-files'));
      }
    };

    window.addEventListener('keydown', shortcuts);

    return () => window.removeEventListener('keydown', shortcuts);
  }, []);
  if (phase === 'loading') {
    return (
      <div className="converter-feature">
        <section className="startup" role="status">
          <LoaderCircle size={28} className="spin" />
          <p>{t('ui.startup')}</p>
        </section>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="converter-feature">
        <section className="startup">
          <CircleAlert size={32} />
          <h2>{t('ui.startupError')}</h2>
          <p>{error}</p>
          <Button onClick={retry}>{t('ui.retryStartup')}</Button>
        </section>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={150}>
      <div className="converter-feature">
        <Tabs
          className="tabs"
          value={media}
          onValueChange={(value) => setMedia(value as MediaType)}
        >
          <div className="desktop-toolbar">
            <TabsList className="tab-list" aria-label={t('ui.queue')}>
              {supportedMedia.map((type) => {
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
            {toolbar}
          </div>
          {supportedMedia.map((type) => (
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
      </div>
    </TooltipProvider>
  );
}
