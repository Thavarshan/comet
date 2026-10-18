import {
  isTerminal,
  type Capabilities,
  type CancelResult,
  type MediaMetadata,
  type MediaType,
} from '@comet/contracts';
import {
  applyJobEvent,
  assertMediaAvailable,
  assertOutputAvailable,
  nextQueuedJob,
  type ConversionJob,
  type ConversionQueue,
} from './index.js';
import {
  ConversionServiceError,
  type ConversionRequest,
  type ConversionService,
  type InputFile,
} from './service.js';

/** Execute platform work while retaining handles and output bytes privately. */
export interface QueueExecutor {
  capabilities(): Promise<Capabilities>;
  validate(request: ConversionRequest): Promise<void>;
  probe(file: InputFile, signal: AbortSignal): Promise<MediaMetadata>;
  execute(
    job: ConversionJob,
    signal: AbortSignal,
    progress: (value: number | null, metadata?: MediaMetadata) => void,
  ): Promise<void>;
  cleanup(job: ConversionJob): Promise<void>;
}

interface Inspection {
  file: InputFile;
  controller: AbortController;
  resolve(metadata: MediaMetadata): void;
  reject(error: unknown): void;
}

/**
 * A portable single-slot queue for browser adapters and contract fixtures.
 * Native desktop retains its existing scheduler; both run the same contracts.
 */
export class QueueConversionService implements ConversionService {
  private queue: ConversionQueue = { revision: 0, batches: [], jobs: [] };

  private readonly listeners = new Set<(queue: ConversionQueue) => void>();

  private readonly inspections: Inspection[] = [];

  private active:
    | {
        controller: AbortController;
        done: Promise<void>;
        job?: ConversionJob;
      }
    | undefined;

  private pumping = false;

  private closed = false;

  private disposal: Promise<void> | undefined;

  private admissions: Promise<void> = Promise.resolve();

  constructor(private readonly executor: QueueExecutor) {}

  async discoverCapabilities(): Promise<Capabilities> {
    this.assertOpen();

    return structuredClone(await this.executor.capabilities());
  }

  async enqueue(input: ConversionRequest): Promise<ConversionQueue> {
    this.assertOpen();
    const request = structuredClone(input);
    const accept = this.admissions.then(async () => {
      this.assertOpen();
      if (
        !request.files.length ||
        request.files.length > 1000 ||
        new Set(request.files.map((file) => file.id)).size !==
          request.files.length
      ) {
        throw new ConversionServiceError(
          'invalid-input',
          'Invalid input batch',
        );
      }

      assertMediaAvailable(this.queue.jobs, request.mediaType);
      assertOutputAvailable(
        await this.discoverCapabilities(),
        request.mediaType,
        request.outputFormat,
        request.spec,
      );
      await this.executor.validate(request);
      this.assertOpen();
      const batchId = crypto.randomUUID();
      const jobs: ConversionJob[] = request.files.map((file) => ({
        id: crypto.randomUUID(),
        batchId,
        itemId: file.id,
        name: file.name,
        sizeBytes: file.sizeBytes,
        mediaType: request.mediaType,
        outputFormat: request.outputFormat,
        target: request.target,
        spec: request.spec,
        state: 'queued',
        progress: 0,
      }));
      this.queue.batches.push({
        id: batchId,
        mediaType: request.mediaType,
        jobIds: jobs.map((job) => job.id),
      });
      this.queue.jobs.push(...jobs);
      this.emit();
      void this.pump();

      return this.snapshot();
    });
    this.admissions = accept.then(
      () => {},
      () => {},
    );

    return accept;
  }

  async getSnapshot(): Promise<ConversionQueue> {
    this.assertOpen();

    return this.snapshot();
  }

  subscribe(listener: (queue: ConversionQueue) => void): () => void {
    this.assertOpen();
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async probe(file: InputFile, signal?: AbortSignal): Promise<MediaMetadata> {
    this.assertOpen();
    signal?.throwIfAborted();
    if (this.inspections.length >= 1000) {
      throw new ConversionServiceError(
        'invalid-input',
        'Inspection queue full',
      );
    }

    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      return await new Promise<MediaMetadata>((resolve, reject) => {
        this.inspections.push({
          file: structuredClone(file),
          controller,
          resolve,
          reject,
        });
        void this.pump();
      });
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  }

  async cancelJob(id: string): Promise<CancelResult> {
    this.assertOpen();
    const job = this.queue.jobs.find((item) => item.id === id);
    if (!job) {
      return { status: 'not-found' };
    }

    if (isTerminal(job.state)) {
      return { status: 'already-terminal' };
    }

    if (job.state === 'queued') {
      Object.assign(
        job,
        applyJobEvent(job, { type: 'canceled', at: Date.now() }),
      );
      this.emit();
    } else {
      Object.assign(job, applyJobEvent(job, { type: 'cancel-requested' }));
      this.emit();
      this.active?.controller.abort();
      await this.active?.done;
      if (job.error?.code === 'CLEANUP_FAILED') {
        throw new ConversionServiceError(
          'conversion-failed',
          job.error.message,
        );
      }
    }

    return { status: 'canceled' };
  }

  async cancelBatch(id: string): Promise<CancelResult> {
    this.assertOpen();
    const jobs = this.queue.jobs.filter((job) => job.batchId === id);
    if (!jobs.length) {
      return { status: 'not-found' };
    }

    if (jobs.every((job) => isTerminal(job.state))) {
      return { status: 'already-terminal' };
    }

    // Cancel queued siblings before awaiting the active job's cleanup.
    await Promise.all([...jobs].reverse().map((job) => this.cancelJob(job.id)));

    return { status: 'canceled' };
  }

  async removeItem(itemId: string): Promise<ConversionQueue> {
    this.assertOpen();

    return this.remove((job) => job.itemId === itemId);
  }

  async clearMedia(media: MediaType): Promise<ConversionQueue> {
    this.assertOpen();

    return this.remove((job) => job.mediaType === media);
  }

  dispose(): Promise<void> {
    this.closed = true;
    this.disposal ??= this.close();

    return this.disposal;
  }

  private async close(): Promise<void> {
    let changed = false;
    for (const job of this.queue.jobs) {
      if (job.state === 'queued') {
        Object.assign(
          job,
          applyJobEvent(job, { type: 'canceled', at: Date.now() }),
        );
        changed = true;
      } else if (!isTerminal(job.state)) {
        Object.assign(job, applyJobEvent(job, { type: 'cancel-requested' }));
        changed = true;
      }
    }

    if (changed) {
      this.emit();
    }

    this.active?.controller.abort();
    for (const inspection of this.inspections.splice(0)) {
      inspection.controller.abort();
      inspection.reject(new DOMException('Service closed', 'AbortError'));
    }

    await this.admissions;
    await this.active?.done;
    const failures: unknown[] = [];
    for (const job of this.queue.jobs) {
      try {
        await this.executor.cleanup(job);
      } catch (error) {
        failures.push(error);
      }
    }

    this.listeners.clear();
    if (failures.length) {
      throw new AggregateError(failures, 'Conversion resource cleanup failed');
    }
  }

  private async remove(
    matches: (job: ConversionJob) => boolean,
  ): Promise<ConversionQueue> {
    if (this.queue.jobs.some((job) => matches(job) && !isTerminal(job.state))) {
      throw new ConversionServiceError(
        'invalid-input',
        'Cancel active jobs first',
      );
    }

    const removed = this.queue.jobs.filter(matches);
    const removedIds = new Set(removed.map((job) => job.id));
    for (const job of removed) {
      await this.executor.cleanup(job);
    }

    // Admission may proceed while old output resources are being released.
    this.queue.jobs = this.queue.jobs.filter((job) => !removedIds.has(job.id));
    const ids = new Set(this.queue.jobs.map((job) => job.id));
    this.queue.batches = this.queue.batches
      .map((batch) => ({
        ...batch,
        jobIds: batch.jobIds.filter((id) => ids.has(id)),
      }))
      .filter((batch) => batch.jobIds.length);
    this.emit();

    return this.snapshot();
  }

  private async pump(): Promise<void> {
    if (this.pumping || this.closed) {
      return;
    }

    this.pumping = true;
    try {
      while (!this.closed) {
        const job = nextQueuedJob(this.queue.jobs);
        const inspection = job ? undefined : this.inspections.shift();
        if (!job && !inspection) {
          break;
        }

        const controller = inspection?.controller ?? new AbortController();
        let finish!: () => void;
        const done = new Promise<void>((resolve) => {
          finish = resolve;
        });
        this.active = { controller, done, ...(job ? { job } : {}) };
        try {
          if (inspection) {
            controller.signal.throwIfAborted();
            const metadata = await this.executor.probe(
              inspection.file,
              controller.signal,
            );
            controller.signal.throwIfAborted();
            inspection.resolve(metadata);
          } else if (job) {
            await this.runJob(job, controller.signal);
          }
        } catch (error) {
          inspection?.reject(error);
        } finally {
          this.active = undefined;
          finish();
        }
      }
    } finally {
      this.pumping = false;
    }
  }

  private async runJob(job: ConversionJob, signal: AbortSignal): Promise<void> {
    Object.assign(job, applyJobEvent(job, { type: 'started', at: Date.now() }));
    this.emit();
    try {
      await this.executor.execute(
        structuredClone(job),
        signal,
        (value, metadata) => {
          const next = applyJobEvent(job, {
            type: 'progress',
            value,
            ...(metadata ? { metadata } : {}),
          });
          if (next !== job) {
            Object.assign(job, next);
            this.emit();
          }
        },
      );
      signal.throwIfAborted();
      Object.assign(
        job,
        applyJobEvent(job, { type: 'succeeded', at: Date.now() }),
      );
    } catch (error) {
      try {
        await this.executor.cleanup(job);
      } catch (cleanupError) {
        Object.assign(
          job,
          applyJobEvent(job, {
            type: 'cleanup-failed',
            at: Date.now(),
            error: {
              code: 'CLEANUP_FAILED',
              message:
                cleanupError instanceof Error
                  ? cleanupError.message
                  : String(cleanupError),
            },
          }),
        );
        this.emit();

        return;
      }

      Object.assign(
        job,
        applyJobEvent(
          job,
          signal.aborted
            ? { type: 'canceled', at: Date.now() }
            : {
                type: 'failed',
                at: Date.now(),
                error: {
                  code: 'CONVERSION_FAILED',
                  message:
                    error instanceof Error ? error.message : String(error),
                },
              },
        ),
      );
    }

    this.emit();
  }

  private emit(): void {
    this.queue.revision++;
    for (const listener of this.listeners) {
      try {
        listener(this.snapshot());
      } catch {
        /* Observers cannot stop cleanup. */
      }
    }
  }

  private snapshot(): ConversionQueue {
    return structuredClone(this.queue);
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new ConversionServiceError('disposed', 'Conversion service closed');
    }
  }
}
