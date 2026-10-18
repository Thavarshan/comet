import { Hint } from '@comet/ui/components/hint';
import { ScrollArea } from '@comet/ui/components/scroll-area';
import { Input } from '@comet/ui/components/input';
import { Disclosure } from '@comet/ui/components/disclosure';
import { useEffect, useId, useRef, useState, type ReactElement } from 'react';
import {
  Ban,
  Check,
  CircleAlert,
  Download,
  FileAudio,
  FileImage,
  FileVideo,
  FolderOpen,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@comet/ui/components/badge';
import { Progress } from '@comet/ui/components/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@comet/ui/components/dialog';
import {
  acceptsFile,
  defaultConversion,
  inputExtensions,
  isTerminal,
  type MediaType,
  type ConversionSpec,
} from '@comet/contracts';
import { Button } from './Button';
import { FormatPicker } from './FormatPicker';
import { FileDetails } from './FileDetails';
import { OutputInspector } from './OutputInspector';
import { useConverter } from './state.js';
import type { ConversionJob as Job } from '@comet/core';
import type { DraftFile } from './platform.js';

const icons = { video: FileVideo, audio: FileAudio, image: FileImage };

/**
 * Keep drafts local while the engine owns immutable jobs and global scheduling.
 * Output controls always configure the next submission, including while busy.
 */
export function ConverterPanel({
  media,
  active = true,
}: {
  media: MediaType;
  active?: boolean;
}): ReactElement | null {
  const { t } = useTranslation();
  const {
    queue,
    preferences,
    capabilities,
    platform,
    report,
    updatePreferences,
    acceptSnapshot,
  } = useConverter();
  const [drafts, setDrafts] = useState<DraftFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const inspectorDialog = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const submissionLock = useRef(false);
  const Icon = icons[media];
  const OutputIcon =
    platform.outputAction?.kind === 'download' ? Download : FolderOpen;
  useEffect(() => {
    if (!active) {
      return;
    }

    const add = () => input.current?.click();
    window.addEventListener('comet:add-files', add);

    return () => window.removeEventListener('comet:add-files', add);
  }, [active]);
  if (!capabilities) {
    return null;
  }

  const settings = preferences.media[media];
  const spec = settings.spec ?? defaultConversion(media);
  const jobsByItem = new Map<string, Job>();
  for (const job of queue.jobs) {
    if (job.mediaType === media) {
      jobsByItem.set(job.itemId, job);
    }
  }

  const jobs = [...jobsByItem.values()];
  const busy = jobs.some((job) => !isTerminal(job.state));
  const batchId = jobs.find((job) => !isTerminal(job.state))?.batchId;
  const failed = jobs.filter(
    (job) => job.state === 'failed' || job.state === 'canceled',
  );
  const retryGroup = failed.filter((job) => job.batchId === failed[0]?.batchId);
  const rows: (DraftFile | Job)[] = [
    ...jobs,
    ...drafts.filter((file) => !jobsByItem.has(file.itemId)),
  ];
  const available = capabilities[spec.kind].some(
    (entry) => entry.format === settings.format && entry.available,
  );

  function addFiles(files: File[]) {
    const rejected: string[] = [];
    const additions: DraftFile[] = [];
    for (const file of files) {
      if (!acceptsFile(media, file.name)) {
        rejected.push(file.name);
        continue;
      }

      try {
        const registered = platform.intake([file]);
        for (const input of registered) {
          additions.push({
            itemId: input.id,
            name: input.name,
            sizeBytes: input.sizeBytes,
          });
        }

        if (!registered.length) {
          rejected.push(file.name);
        }
      } catch {
        rejected.push(file.name);
      }
    }

    setDrafts((previous) => [...previous, ...additions]);
    setNotice(
      rejected.length
        ? t('ui.rejected', {
            names: rejected.join(', '),
          })
        : '',
    );
  }

  async function submit(files: DraftFile[], original?: Job) {
    if (busy || submissionLock.current || !files.length) {
      return;
    }

    submissionLock.current = true;
    setSubmitting(true);
    try {
      const snapshot = await platform.service.enqueue({
        mediaType: media,
        files: files.map(({ itemId, name, sizeBytes }) => ({
          id: itemId,
          name,
          sizeBytes,
        })),
        outputFormat: original?.outputFormat ?? settings.format,
        target: original?.target ?? settings.destination.target,
        spec:
          original?.spec ??
          (original ? defaultConversion(original.mediaType) : spec),
      });
      acceptSnapshot(snapshot);
      const ids = new Set(files.map((file) => file.itemId));
      setDrafts((previous) => previous.filter((file) => !ids.has(file.itemId)));
    } catch (error) {
      report(error);
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  async function selectDirectory() {
    try {
      const destination = await platform.selectDestination?.(media);
      if (destination) {
        await updatePreferences((previous) => ({
          ...previous,
          media: {
            ...previous.media,
            [media]: { ...previous.media[media], destination },
          },
        }));
      }
    } catch (error) {
      report(error);
    }
  }

  async function remove(file: DraftFile | Job) {
    try {
      if ('state' in file) {
        acceptSnapshot(await platform.removeItem(file.itemId));
      } else {
        setDrafts((previous) =>
          previous.filter((item) => item.itemId !== file.itemId),
        );
      }
    } catch (error) {
      report(error);
    }
  }

  async function clear() {
    try {
      acceptSnapshot(await platform.clearMedia(media));
      setDrafts([]);
    } catch (error) {
      report(error);
    }
  }

  const inspector = (
    <OutputInspector
      media={media}
      settings={settings}
      capabilities={capabilities}
      selectDirectory={
        platform.selectDestination ? () => void selectDirectory() : undefined
      }
      change={(format: string, next: ConversionSpec) => {
        void updatePreferences((previous) => ({
          ...previous,
          media: {
            ...previous.media,
            [media]: { ...previous.media[media], format, spec: next },
          },
        }));
      }}
    />
  );

  return (
    <section
      className={`converter ${dragging ? 'dragging' : ''}`}
      aria-label={t(`media.${media}`)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <Input
        ref={input}
        id={inputId}
        className="file-input"
        tabIndex={-1}
        aria-hidden="true"
        type="file"
        multiple
        aria-label={t('ui.addFiles')}
        accept={inputExtensions[media].map((ext) => `.${ext}`).join(',')}
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <div className="conversion-workspace">
        <div className="queue-pane">
          <div className="output-bar">
            {platform.selectDestination ? (
              <Button
                className="destination-button"
                title={
                  settings.destination.description ?? settings.destination.label
                }
                aria-label={t('ui.destination')}
                disabled={!platform.selectDestination}
                onClick={() => void selectDirectory()}
              >
                <FolderOpen size={16} />
                <span className="truncate">{settings.destination.label}</span>
              </Button>
            ) : (
              <span className="destination-button truncate">
                {settings.destination.label}
              </span>
            )}
            <span className="output-label">{t('ui.format')}</span>
            <div className="compact-format">
              <FormatPicker
                value={settings.format}
                options={capabilities[spec.kind]}
                onChange={(format) => {
                  void updatePreferences((previous) => ({
                    ...previous,
                    media: {
                      ...previous.media,
                      [media]: {
                        ...previous.media[media],
                        format,
                        spec: defaultConversion(spec.kind),
                      },
                    },
                  }));
                }}
              />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  icon
                  className="inspector-trigger"
                  aria-label={t('design.output')}
                >
                  <SlidersHorizontal size={16} />
                </Button>
              </DialogTrigger>
              <DialogContent
                ref={inspectorDialog}
                closeLabel={t('ui.dismiss')}
                className="inspector-dialog"
                onOpenAutoFocus={(event) => {
                  // Focus a field rather than the scroll viewport itself.
                  const firstField =
                    inspectorDialog.current?.querySelector<HTMLButtonElement>(
                      '[role="combobox"]',
                    );
                  if (firstField) {
                    event.preventDefault();
                    firstField.focus();
                  }
                }}
              >
                <DialogHeader className="inspector-dialog-header">
                  <DialogTitle>
                    {t(busy ? 'design.nextSubmission' : 'design.output')}
                  </DialogTitle>
                  <DialogDescription>{t('ui.settingsHint')}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="inspector-scroll-area">
                  {inspector}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          <div className="queue-toolbar">
            <h2>
              {t('ui.queue')} <span>{rows.length}</span>
            </h2>
            {!!rows.length && (
              <Button variant="ghost" onClick={() => input.current?.click()}>
                <Plus size={16} />
                {t('ui.addFiles')}
              </Button>
            )}
          </div>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          <ScrollArea className="queue">
            {!rows.length ? (
              <div className="import-canvas">
                <div className="import-symbol">
                  <Upload size={25} />
                </div>
                <h3>
                  {t('upload.title', {
                    type: t(`media.${media}`).toLowerCase(),
                  })}
                </h3>
                <p>{t('ui.emptyDescription')}</p>
                <Button
                  variant="primary"
                  onClick={() => input.current?.click()}
                >
                  <Plus size={16} />
                  {t('ui.addFiles')}
                </Button>
                <span className="keyboard-hint">⌘ / Ctrl + O</span>
                <div className="supported-hint">
                  {inputExtensions[media].slice(0, 6).map((format) => (
                    <Badge key={format} variant="outline">
                      {format.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="file-list">
                {rows.map((file) => {
                  const job = 'state' in file ? file : undefined;
                  const state = job?.state ?? 'ready';
                  const terminal = !job || isTerminal(job.state);
                  let StatusIcon = Icon;
                  if (state === 'succeeded') {
                    StatusIcon = Check;
                  }

                  if (state === 'failed') {
                    StatusIcon = CircleAlert;
                  }

                  return (
                    <li key={file.itemId} className={`file-row state-${state}`}>
                      <div className="file-icon">
                        <StatusIcon size={20} />
                      </div>
                      <div className="file-info">
                        <Hint
                          content={
                            platform.describeInput?.(file.itemId) ?? file.name
                          }
                        >
                          <strong>{file.name}</strong>
                        </Hint>
                        <FileDetails
                          file={file}
                          metadata={job?.metadata}
                          locale={preferences.locale}
                        />
                        <div className="file-meta">
                          <span className="status" role="status">
                            <span className="status-dot" />
                            {t(`ui.${state}`)}
                          </span>
                          <span>
                            →{' '}
                            {(
                              job?.outputFormat ?? settings.format
                            ).toUpperCase()}
                          </span>
                          {job?.spec &&
                            job.spec.kind !== 'image' &&
                            job.spec.codec !== 'default' && (
                              <span>{job.spec.codec.toUpperCase()}</span>
                            )}
                        </div>
                        {job && !terminal && (
                          <Progress
                            aria-label={`${t('ui.progress')}: ${file.name}`}
                            value={job.progress}
                            className="mt-3"
                          />
                        )}
                        {job?.error && (
                          <Disclosure
                            className="job-error"
                            label={t('ui.details')}
                          >
                            <p>{job.error.message}</p>
                          </Disclosure>
                        )}
                      </div>
                      <div className="file-actions">
                        {job?.state === 'succeeded' &&
                          platform.outputAction && (
                            <Button
                              icon
                              variant="ghost"
                              aria-label={`${platform.outputAction.label()}: ${file.name}`}
                              onClick={() =>
                                void platform.outputAction
                                  ?.run(job.id)
                                  .catch(report)
                              }
                            >
                              <OutputIcon size={16} />
                            </Button>
                          )}
                        {job &&
                          (job.state === 'failed' ||
                            job.state === 'canceled') && (
                            <Button
                              icon
                              variant="ghost"
                              disabled={busy || submitting}
                              aria-label={`${t('ui.retry')}: ${file.name}`}
                              title={t('design.retryOriginal')}
                              onClick={() => void submit([file], job)}
                            >
                              <RefreshCw size={16} />
                            </Button>
                          )}
                        {job && !terminal ? (
                          <Button
                            icon
                            variant="ghost"
                            aria-label={`${t('ui.cancelJob')}: ${file.name}`}
                            disabled={job.state === 'canceling'}
                            onClick={() => {
                              void platform.service
                                .cancelJob(job.id)
                                .catch(report);
                            }}
                          >
                            <Ban size={16} />
                          </Button>
                        ) : (
                          <Button
                            icon
                            variant="ghost"
                            aria-label={`${t('ui.remove')}: ${file.name}`}
                            onClick={() => void remove(file)}
                          >
                            <X size={16} />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
          <footer className="actions">
            <Button
              variant="ghost"
              title={t('design.clearHint')}
              disabled={busy || submitting || !rows.length}
              onClick={() => void clear()}
            >
              <Trash2 size={15} />
              {t('ui.clear')}
            </Button>
            <div className="flex gap-2 flex-wrap justify-end">
              {!busy && !!retryGroup.length && (
                <Button
                  disabled={submitting}
                  title={t('design.retryOriginal')}
                  onClick={() => void submit(retryGroup, retryGroup[0])}
                >
                  <RefreshCw size={15} />
                  {t('ui.retryFailed')}
                </Button>
              )}
              {batchId && (
                <Button
                  variant="danger"
                  disabled={submitting}
                  aria-label={t('ui.cancelBatch')}
                  onClick={() => {
                    void platform.service.cancelBatch(batchId).catch(report);
                  }}
                >
                  <Ban size={15} />
                  {t('ui.cancelBatch')}
                  <span>{t(`media.${media}`)}</span>
                </Button>
              )}
              <Button
                variant="primary"
                disabled={busy || submitting || !available || !drafts.length}
                aria-label={t('ui.convert')}
                title={busy ? t('design.waitForBatch') : undefined}
                onClick={() => void submit(drafts)}
              >
                <RefreshCw size={15} className={submitting ? 'spin' : ''} />
                {t('ui.convert')}
                {!!drafts.length && <span>{drafts.length}</span>}
              </Button>
            </div>
          </footer>
        </div>
      </div>
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          <Upload size={35} />
          {t('ui.addFiles')}
        </div>
      )}
    </section>
  );
}
