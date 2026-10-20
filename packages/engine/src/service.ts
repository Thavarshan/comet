import { randomUUID } from 'node:crypto';
import {
  assertOutputAvailable,
  ConversionServiceError,
  type ConversionQueue,
  type ConversionRequest,
  type ConversionService,
  type InputFile,
} from '@honeymelon/core';
import type {
  Capabilities,
  CancelResult,
  MediaMetadata,
  QueueSnapshot,
  SourceFile,
} from '@honeymelon/contracts';
import type { ConversionEngine } from './index.js';

/** Remove all native handles before crossing the portable service boundary. */
function portable(snapshot: QueueSnapshot): ConversionQueue {
  return {
    revision: snapshot.revision,
    batches: snapshot.batches,
    jobs: snapshot.jobs.map((job) => ({
      id: job.id,
      batchId: job.batchId,
      itemId: job.itemId,
      name: job.name,
      sizeBytes: job.sizeBytes,
      mediaType: job.mediaType,
      outputFormat: job.outputFormat,
      spec: job.spec,
      state: job.state,
      progress: job.progress,
      ...(job.metadata ? { metadata: job.metadata } : {}),
      ...(job.startedAt !== undefined ? { startedAt: job.startedAt } : {}),
      ...(job.completedAt !== undefined
        ? { completedAt: job.completedAt }
        : {}),
      ...(job.error ? { error: job.error } : {}),
    })),
  };
}

/**
 * Main-process adapter over the existing scheduler, never a second queue.
 * A service owns its engine and must be disposed before its host exits.
 */
export class NativeConversionService implements ConversionService {
  private readonly inputs = new Map<string, SourceFile>();

  private readonly targets = new Map<string, string>();

  private readonly subscriptions = new Set<() => void>();

  private disposal: Promise<void> | undefined;

  constructor(
    private readonly engine: ConversionEngine,
    private readonly capabilities: Capabilities,
  ) {}

  /** Register only files obtained through the host's trusted intake flow. */
  registerInput(file: SourceFile): InputFile {
    this.assertOpen();
    const id = randomUUID();
    this.inputs.set(id, { ...file, itemId: id });

    return { id, name: file.name, sizeBytes: file.sizeBytes };
  }

  /** Keep directory selection and native paths outside shared UI state. */
  registerTarget(directory: string): { id: string } {
    this.assertOpen();
    const id = randomUUID();
    this.targets.set(id, directory);

    return { id };
  }

  async discoverCapabilities(): Promise<Capabilities> {
    this.assertOpen();

    return structuredClone(this.capabilities);
  }

  async probe(file: InputFile, signal?: AbortSignal): Promise<MediaMetadata> {
    this.assertOpen();
    signal?.throwIfAborted();
    // A probe owns its cancellation identity, even for a repeated input.
    const source = { ...this.resolveInput(file), itemId: randomUUID() };
    const abort = () => this.engine.cancelInspection(source.itemId);
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const metadata = await this.engine.inspectFile(source);
      signal?.throwIfAborted();

      return metadata;
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  }

  async enqueue(request: ConversionRequest): Promise<ConversionQueue> {
    this.assertOpen();
    const directory = this.targets.get(request.target.id);
    if (!directory) {
      throw new ConversionServiceError(
        'invalid-target',
        'Select an output directory again',
      );
    }

    assertOutputAvailable(
      this.capabilities,
      request.mediaType,
      request.outputFormat,
      request.spec,
    );

    return portable(
      await this.engine.enqueueBatch({
        mediaType: request.mediaType,
        items: request.files.map((file) => this.resolveInput(file)),
        outputDirectory: directory,
        outputFormat: request.outputFormat,
        ...(request.spec ? { spec: request.spec } : {}),
      }),
    );
  }

  async getSnapshot(): Promise<ConversionQueue> {
    this.assertOpen();

    return portable(this.engine.getSnapshot());
  }

  subscribe(listener: (queue: ConversionQueue) => void): () => void {
    this.assertOpen();
    const remove = this.engine.subscribe((queue) => listener(portable(queue)));
    const unsubscribe = () => {
      remove();
      this.subscriptions.delete(unsubscribe);
    };

    this.subscriptions.add(unsubscribe);

    return unsubscribe;
  }

  async cancelJob(id: string): Promise<CancelResult> {
    this.assertOpen();

    return this.engine.cancelJob(id);
  }

  async cancelBatch(id: string): Promise<CancelResult> {
    this.assertOpen();

    return this.engine.cancelBatch(id);
  }

  dispose(): Promise<void> {
    this.disposal ??= this.engine.shutdown().finally(() => {
      for (const unsubscribe of this.subscriptions) {
        unsubscribe();
      }

      this.inputs.clear();
      this.targets.clear();
    });

    return this.disposal;
  }

  private resolveInput(file: InputFile): SourceFile {
    const source = this.inputs.get(file.id);
    if (!source) {
      throw new ConversionServiceError(
        'invalid-input',
        'Select the file again',
      );
    }

    return structuredClone(source);
  }

  private assertOpen(): void {
    if (this.disposal) {
      throw new ConversionServiceError('disposed', 'Conversion service closed');
    }
  }
}
