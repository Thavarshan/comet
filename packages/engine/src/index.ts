import {
  applyJobEvent,
  assertOutputAvailable,
  assertMediaAvailable,
  nextQueuedJob,
} from '@comet/core';
import { resolveEncoding } from './options.js';
import { probeFile } from './metadata.js';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import {
  batchSchema,
  defaultConversion,
  isTerminal,
  type BatchRequest,
  type Batch,
  type CancelResult,
  type Capabilities,
  type Job,
  type MediaType,
  type MediaMetadata,
  type SourceFile,
  type QueueSnapshot,
} from '@comet/contracts';
import {
  createExecutor,
  assertDirectory,
  type EnginePaths,
  type Executor,
} from './adapter.js';

export {
  createExecutor,
  convertImage,
  type EnginePaths,
  type Executor,
} from './adapter.js';

export { detectCapabilities } from './profiles.js';

export { runProcess } from './process.js';

export { NativeConversionService } from './service.js';

/**
 * Hold the execution slot until cancellation and native cleanup settle.
 */
interface ActiveJob {
  id: string;
  controller: AbortController;
  done: Promise<void>;
  resolve: () => void;
}

/**
 * Own the global FIFO queue and all job state transitions.
 *
 * A slot remains occupied until the native process or worker exits and its
 * partial files are removed. Renderers only submit commands and read snapshots.
 */
export class ConversionEngine {
  private jobs: Job[] = [];

  private inspections: {
    file: SourceFile;
    controller: AbortController;
    resolve: (metadata: MediaMetadata) => void;
    reject: (error: unknown) => void;
  }[] = [];

  private inspectionController: AbortController | undefined;

  private inspectionId: string | undefined;

  private inspectionDone: Promise<void> | undefined;

  private probePath: string | undefined;

  private batches: Batch[] = [];

  private revision = 0;

  private listeners = new Set<(snapshot: QueueSnapshot) => void>();

  private pumping = false;

  private closed = false;

  private submissions: Promise<void> = Promise.resolve();

  private active: ActiveJob | undefined;

  private readonly execute: Executor;

  constructor(
    private readonly capabilities: Capabilities,
    paths: EnginePaths | Executor,
    private readonly validateDirectory = assertDirectory,
  ) {
    this.execute = typeof paths === 'function' ? paths : createExecutor(paths);
    this.probePath =
      typeof paths === 'function' ? undefined : paths.ffprobePath;
  }

  /**
   * Return an isolated snapshot that callers may safely retain or mutate.
   */
  getSnapshot(): QueueSnapshot {
    return structuredClone({
      revision: this.revision,
      batches: this.batches,
      jobs: this.jobs,
    });
  }

  /**
   * Observe revisions; the returned function removes only this listener.
   */
  subscribe(listener: (snapshot: QueueSnapshot) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Inspect drafts using the same native execution budget as conversions.
   * Submitted jobs are prioritized over optional source inspection.
   */
  inspectFile(file: SourceFile): Promise<MediaMetadata> {
    if (this.closed || !this.probePath) {
      return Promise.reject(new Error('Inspection unavailable'));
    }

    if (this.inspections.length >= 1000) {
      return Promise.reject(new Error('Inspection queue is full'));
    }

    return new Promise((resolve, reject) => {
      this.inspections.push({
        file: structuredClone(file),
        controller: new AbortController(),
        resolve,
        reject,
      });
      void this.pump();
    });
  }

  /** Cancel queued or running inspection when a draft disappears. */
  cancelInspection(itemId: string): void {
    for (const item of this.inspections) {
      if (item.file.itemId === itemId) {
        item.controller.abort();
      }
    }

    if (this.inspectionId === itemId) {
      this.inspectionController?.abort();
    }
  }

  private emit() {
    this.revision++;
    for (const listener of this.listeners) {
      try {
        listener(this.getSnapshot());
      } catch {
        /* A disconnected consumer must not interrupt native cleanup. */
      }
    }
  }

  /**
   * Validate and snapshot a batch while preserving submission arrival order.
   */
  async enqueueBatch(input: BatchRequest): Promise<QueueSnapshot> {
    const request = batchSchema.parse(input);
    // Directory checks can finish out of order. Reserve submission order before
    // awaiting filesystem work so concurrent tabs retain their arrival order.
    const pending = this.submissions.then(() => this.acceptBatch(request));
    this.submissions = pending.then(
      () => {},
      () => {},
    );

    return pending;
  }

  private async acceptBatch(request: BatchRequest): Promise<QueueSnapshot> {
    await this.validateDirectory(request.outputDirectory);
    if (this.closed) {
      throw new Error('Engine is shutting down');
    }

    assertMediaAvailable(this.jobs, request.mediaType);

    assertOutputAvailable(
      this.capabilities,
      request.mediaType,
      request.outputFormat,
      request.spec,
    );
    resolveEncoding(
      request.outputFormat,
      request.spec ?? defaultConversion(request.mediaType),
    );
    const batchId = randomUUID();
    const jobs: Job[] = request.items.map((item) => ({
      ...item,
      id: randomUUID(),
      batchId,
      mediaType: request.mediaType,
      outputFormat: request.outputFormat,
      outputDirectory: request.outputDirectory,
      spec: request.spec ?? defaultConversion(request.mediaType),
      state: 'queued',
      progress: 0,
    }));
    this.jobs.push(...jobs);
    this.batches.push({
      id: batchId,
      mediaType: request.mediaType,
      jobIds: jobs.map((job) => job.id),
    });
    this.emit();
    queueMicrotask(() => {
      void this.pump();
    });

    return this.getSnapshot();
  }

  /**
   * Resolve only after the selected job is terminal and cleanup is complete.
   */
  async cancelJob(id: string): Promise<CancelResult> {
    const job = this.jobs.find((job) => job.id === id);
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
      const active = this.active;
      Object.assign(job, applyJobEvent(job, { type: 'cancel-requested' }));
      this.emit();
      active?.controller.abort();
      await active?.done;
    }

    return { status: 'canceled' };
  }

  /**
   * Cancel this batch atomically without stopping another media category.
   */
  async cancelBatch(id: string): Promise<CancelResult> {
    const batch = this.batches.find((batch) => batch.id === id);
    if (!batch) {
      return { status: 'not-found' };
    }

    const jobs = this.jobs.filter(
      (job) => job.batchId === id && !isTerminal(job.state),
    );
    if (!jobs.length) {
      return { status: 'already-terminal' };
    }

    // Mark every waiting job before yielding, so cancellation cannot start
    // another sibling.
    for (const job of jobs) {
      if (job.state === 'queued') {
        Object.assign(
          job,
          applyJobEvent(job, { type: 'canceled', at: Date.now() }),
        );
      }
    }

    this.emit();
    await Promise.all(
      jobs
        .filter((job) => !isTerminal(job.state))
        .map((job) => this.cancelJob(job.id)),
    );

    return { status: 'canceled' };
  }

  /**
   * Forget terminal retry history for one row; active jobs cannot be removed.
   */
  removeItem(itemId: string): QueueSnapshot {
    const jobs = this.jobs.filter((job) => job.itemId === itemId);
    if (jobs.some((job) => !isTerminal(job.state))) {
      throw new Error('Cancel the item before removing it');
    }

    this.forget(new Set(jobs.map((job) => job.id)));

    return this.getSnapshot();
  }

  /**
   * Clear a media view only when every submitted job in it is terminal.
   */
  clearMedia(media: MediaType): QueueSnapshot {
    const jobs = this.jobs.filter((job) => job.mediaType === media);
    if (jobs.some((job) => !isTerminal(job.state))) {
      throw new Error('Cancel the batch before clearing it');
    }

    this.forget(new Set(jobs.map((job) => job.id)));

    return this.getSnapshot();
  }

  private forget(ids: Set<string>) {
    this.jobs = this.jobs.filter((job) => !ids.has(job.id));
    this.batches = this.batches
      .map((batch) => ({
        ...batch,
        jobIds: batch.jobIds.filter((id) => !ids.has(id)),
      }))
      .filter((batch) => batch.jobIds.length);
    this.emit();
  }

  /**
   * Reject new work, cancel pending jobs, and await native termination.
   */
  async shutdown(): Promise<void> {
    this.closed = true;
    this.inspectionController?.abort();
    await this.inspectionDone;
    for (const item of this.inspections.splice(0)) {
      item.reject(new Error('Engine is shutting down'));
    }

    for (const job of this.jobs) {
      if (job.state === 'queued') {
        Object.assign(
          job,
          applyJobEvent(job, { type: 'canceled', at: Date.now() }),
        );
      }
    }

    this.emit();
    if (this.active) {
      await this.cancelJob(this.active.id);
    }

    this.listeners.clear();
  }

  /**
   * Execute one job at a time, advancing past ordinary failures.
   */
  private async pump() {
    if (this.pumping || this.closed) {
      return;
    }

    this.pumping = true;
    try {
      let job: Job | undefined;
      while (!this.closed) {
        job = nextQueuedJob(this.jobs);
        if (!job) {
          const inspection = this.inspections.shift();
          if (!inspection || !this.probePath) {
            break;
          }

          this.inspectionController = inspection.controller;
          this.inspectionId = inspection.file.itemId;
          let finish!: () => void;
          this.inspectionDone = new Promise<void>((resolve) => {
            finish = resolve;
          });
          try {
            inspection.resolve(
              await probeFile(
                this.probePath,
                inspection.file.inputPath,
                inspection.controller.signal,
                /\.(gif|webp|tiff?)$/i.test(inspection.file.name),
              ),
            );
          } catch (error) {
            inspection.reject(error);
          } finally {
            this.inspectionController = undefined;
            this.inspectionId = undefined;
            this.inspectionDone = undefined;
            finish();
          }

          continue;
        }

        const current = job;
        const controller = new AbortController();
        let resolve!: () => void;
        const done = new Promise<void>((finish) => {
          resolve = finish;
        });
        this.active = { id: current.id, controller, done, resolve };
        Object.assign(
          current,
          applyJobEvent(current, { type: 'started', at: Date.now() }),
        );
        this.emit();
        try {
          const output = await this.execute(
            structuredClone(current),
            controller.signal,
            (progress, metadata) => {
              const next = applyJobEvent(current, {
                type: 'progress',
                value: progress,
                ...(metadata ? { metadata } : {}),
              });
              if (next === current) {
                return;
              }

              Object.assign(current, next);
              this.emit();
            },
          );
          if (controller.signal.aborted) {
            await rm(output, { force: true });
            controller.signal.throwIfAborted();
          }

          current.outputPath = output;
          Object.assign(
            current,
            applyJobEvent(current, { type: 'succeeded', at: Date.now() }),
          );
        } catch (error) {
          if (controller.signal.aborted) {
            Object.assign(
              current,
              applyJobEvent(current, { type: 'canceled', at: Date.now() }),
            );
          } else {
            Object.assign(
              current,
              applyJobEvent(current, {
                type: 'failed',
                at: Date.now(),
                error: {
                  code: 'CONVERSION_FAILED',
                  message:
                    error instanceof Error ? error.message : String(error),
                },
              }),
            );
          }
        } finally {
          this.active = undefined;
          this.emit();
          resolve();
        }
      }
    } finally {
      this.pumping = false;
    }
  }
}
