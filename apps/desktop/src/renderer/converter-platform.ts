import {
  ConversionServiceError,
  type ConversionQueue,
  type ConversionService,
  type InputFile,
} from '@honeymelon/core';
import {
  mediaTypes,
  unwrap,
  type DesktopBridge,
  type Preferences,
  type QueueSnapshot,
  type SourceFile,
} from '@honeymelon/contracts';
import type {
  ConverterPlatform,
  ConverterPreferences,
  Destination,
} from '@honeymelon/converter';
import i18n from './i18n';

/**
 * Adapt the existing preload transport without exposing it to shared UI.
 * Renderer reload reconnects to the living main-process engine.
 */
export class DesktopConverterPlatform implements ConverterPlatform {
  private readonly inputs = new Map<string, SourceFile>();

  private readonly targets = new Map<string, Destination>();

  private readonly subscriptions = new Set<() => void>();

  private closed = false;

  readonly service: ConversionService;

  readonly outputAction: NonNullable<ConverterPlatform['outputAction']>;

  constructor(private readonly bridge: DesktopBridge<File>) {
    this.service = {
      discoverCapabilities: async () => {
        this.assertOpen();

        return unwrap(await bridge.getEnvironment()).capabilities;
      },
      getSnapshot: async () => this.project(unwrap(await bridge.getSnapshot())),
      subscribe: (listener) => {
        this.assertOpen();
        const remove = bridge.onQueueChanged((queue) => {
          listener(this.project(queue));
        });
        const unsubscribe = () => {
          remove();
          this.subscriptions.delete(unsubscribe);
        };

        this.subscriptions.add(unsubscribe);

        return unsubscribe;
      },
      enqueue: async (request) =>
        this.project(
          unwrap(
            await bridge.enqueueBatch({
              mediaType: request.mediaType,
              items: request.files.map((file) => this.source(file.id)),
              outputFormat: request.outputFormat,
              outputDirectory: this.directory(request.target.id),
              ...(request.spec ? { spec: request.spec } : {}),
            }),
          ),
        ),
      probe: async (file, signal) => {
        signal?.throwIfAborted();
        const source = { ...this.source(file.id), itemId: crypto.randomUUID() };
        const abort = () => {
          void bridge.cancelInspection(source.itemId).catch(() => {});
        };

        signal?.addEventListener('abort', abort, { once: true });
        try {
          const metadata = unwrap(await bridge.inspectFile(source));
          signal?.throwIfAborted();

          return metadata;
        } finally {
          signal?.removeEventListener('abort', abort);
        }
      },
      cancelJob: async (id) => {
        this.assertOpen();

        return unwrap(await bridge.cancelJob(id));
      },
      cancelBatch: async (id) => {
        this.assertOpen();

        return unwrap(await bridge.cancelBatch(id));
      },
      dispose: async () => {
        this.closed = true;
        for (const unsubscribe of this.subscriptions) {
          unsubscribe();
        }

        this.inputs.clear();
        this.targets.clear();
      },
    };
    this.outputAction = {
      kind: 'reveal',
      label: () => i18n.t('design.reveal'),
      run: async (id) => unwrap(await bridge.revealOutput(id)),
    };
  }

  intake(files: File[]): InputFile[] {
    this.assertOpen();

    return files.map((file) => {
      const inputPath = this.bridge.getFilePath(file);
      if (!inputPath) {
        throw new ConversionServiceError(
          'invalid-input',
          'Select a local file',
        );
      }

      const id = crypto.randomUUID();
      this.inputs.set(id, {
        itemId: id,
        inputPath,
        name: file.name,
        sizeBytes: file.size,
      });

      return { id, name: file.name, sizeBytes: file.size };
    });
  }

  describeInput(id: string): string | undefined {
    return this.inputs.get(id)?.inputPath;
  }

  async selectDestination(
    media: (typeof mediaTypes)[number],
  ): Promise<Destination | null> {
    const directory = unwrap(await this.bridge.selectDirectory(media));

    return directory ? this.destination(directory) : null;
  }

  async removeItem(id: string): Promise<ConversionQueue> {
    const queue = this.project(unwrap(await this.bridge.removeItem(id)));
    this.inputs.delete(id);

    return queue;
  }

  async clearMedia(
    media: (typeof mediaTypes)[number],
  ): Promise<ConversionQueue> {
    return this.project(unwrap(await this.bridge.clearMedia(media)));
  }

  /** Translate native persistence into portable output preferences. */
  preferences(value: Preferences): ConverterPreferences {
    const settings = (media: (typeof mediaTypes)[number]) => ({
      format: value.media[media].format,
      spec: value.media[media].spec,
      destination: this.destination(value.media[media].directory),
    });

    return {
      locale: value.locale,
      media: {
        video: settings('video'),
        audio: settings('audio'),
        image: settings('image'),
      },
    };
  }

  /** Preserve app identity, theme, migration flags, and stable native keys. */
  applyPreferences(
    previous: Preferences,
    next: ConverterPreferences,
  ): Preferences {
    const value = structuredClone(previous);
    for (const media of mediaTypes) {
      const settings = next.media[media];
      value.media[media] = {
        format: settings.format,
        directory: this.directory(settings.destination.target.id),
        ...(settings.spec ? { spec: settings.spec } : {}),
      };
    }

    return value;
  }

  private source(id: string): SourceFile {
    this.assertOpen();
    const file = this.inputs.get(id);
    if (!file) {
      throw new ConversionServiceError(
        'invalid-input',
        'Select the file again',
      );
    }

    return structuredClone(file);
  }

  private destination(directory: string): Destination {
    this.assertOpen();
    const existing = this.targets.get(directory);
    if (existing) {
      return existing;
    }

    const destination: Destination = {
      target: { id: crypto.randomUUID() },
      label: directory.split(/[\\/]/).filter(Boolean).at(-1) ?? directory,
      description: directory,
    };
    this.targets.set(directory, destination);

    return destination;
  }

  private directory(id: string): string {
    for (const [directory, destination] of this.targets) {
      if (destination.target.id === id) {
        return directory;
      }
    }

    throw new ConversionServiceError('invalid-target', 'Select a destination');
  }

  private project(queue: QueueSnapshot): ConversionQueue {
    this.assertOpen();

    return {
      revision: queue.revision,
      batches: queue.batches,
      jobs: queue.jobs.map((job) => {
        this.inputs.set(job.itemId, {
          itemId: job.itemId,
          inputPath: job.inputPath,
          name: job.name,
          sizeBytes: job.sizeBytes,
        });

        return {
          id: job.id,
          batchId: job.batchId,
          itemId: job.itemId,
          name: job.name,
          sizeBytes: job.sizeBytes,
          mediaType: job.mediaType,
          outputFormat: job.outputFormat,
          spec: job.spec,
          target: this.destination(job.outputDirectory).target,
          state: job.state,
          progress: job.progress,
          ...(job.metadata ? { metadata: job.metadata } : {}),
          ...(job.error ? { error: job.error } : {}),
          ...(job.startedAt !== undefined ? { startedAt: job.startedAt } : {}),
          ...(job.completedAt !== undefined
            ? { completedAt: job.completedAt }
            : {}),
        };
      }),
    };
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new ConversionServiceError('disposed', 'Conversion service closed');
    }
  }
}
