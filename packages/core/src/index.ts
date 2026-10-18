import {
  isTerminal,
  type Batch,
  type Capabilities,
  type ConversionSpec,
  type JobState,
  type MediaMetadata,
  type MediaType,
} from '@comet/contracts';
import { ConversionServiceError } from './service.js';

export {
  ConversionServiceError,
  classifyConversionError,
  outputFilename,
  type ConversionErrorCode,
  type ConversionRequest,
  type ConversionService,
  type InputFile,
  type OutputTarget,
} from './service.js';

/** A conversion record without native paths or platform I/O. */
export interface ConversionJob {
  id: string;
  batchId: string;
  itemId: string;
  name: string;
  sizeBytes: number;
  mediaType: MediaType;
  outputFormat: string;
  spec?: ConversionSpec | undefined;
  state: JobState;
  progress: number | null;
  metadata?: MediaMetadata;
  startedAt?: number;
  completedAt?: number;
  error?: { code: string; message: string };
}

/** A domain view; adapters retain input/output handles separately. */
export interface ConversionQueue {
  revision: number;
  batches: Batch[];
  jobs: ConversionJob[];
}

/** Choose the next submission without reordering media views. */
export function nextQueuedJob<T extends ConversionJob>(
  jobs: readonly T[],
): T | undefined {
  return jobs.find((job) => job.state === 'queued');
}

/** Reject a second live batch in the same media view. */
export function assertMediaAvailable(
  jobs: readonly ConversionJob[],
  media: MediaType,
): void {
  if (jobs.some((job) => job.mediaType === media && !isTerminal(job.state))) {
    throw new Error('This media type already has a submitted batch');
  }
}

/** Only adapters may report completion after their resource cleanup settles. */
export type JobEvent =
  | { type: 'started'; at: number }
  | { type: 'progress'; value: number | null; metadata?: MediaMetadata }
  | { type: 'cancel-requested' }
  | { type: 'canceled'; at: number }
  | { type: 'succeeded'; at: number }
  | { type: 'failed'; at: number; error: { code: string; message: string } };

/** Apply lifecycle events without late progress or terminal races. */
export function applyJobEvent<T extends ConversionJob>(
  job: T,
  event: JobEvent,
): T {
  if (isTerminal(job.state)) {
    return job;
  }

  if ('at' in event && (!Number.isFinite(event.at) || event.at < 0)) {
    throw new Error('Invalid lifecycle timestamp');
  }

  switch (event.type) {
    case 'started':
      return job.state === 'queued'
        ? { ...job, state: 'running', startedAt: event.at }
        : job;
    case 'progress': {
      if (
        job.state !== 'running' ||
        (event.value !== null && !Number.isFinite(event.value))
      ) {
        return job;
      }

      const progress =
        event.value === null
          ? null
          : Math.max(0, Math.min(99, Math.floor(event.value)));
      if (progress === job.progress && !event.metadata) {
        return job;
      }

      return {
        ...job,
        progress,
        ...(event.metadata ? { metadata: event.metadata } : {}),
      };
    }

    case 'cancel-requested':
      return job.state === 'running' ? { ...job, state: 'canceling' } : job;
    case 'canceled':
      return { ...job, state: 'canceled', progress: 0, completedAt: event.at };
    case 'succeeded':
      return job.state === 'running'
        ? { ...job, state: 'succeeded', progress: 100, completedAt: event.at }
        : job;
    case 'failed':
      return job.state === 'running'
        ? { ...job, state: 'failed', error: event.error, completedAt: event.at }
        : job;
  }
}

/** Preserve the current reference for stale or repeated revision deliveries. */
export function acceptQueueSnapshot<T extends { revision: number }>(
  current: T,
  incoming: T,
): T {
  return incoming.revision > current.revision ? incoming : current;
}

/** Validate output availability independently of native arguments. */
export function assertOutputAvailable(
  capabilities: Capabilities,
  source: MediaType,
  format: string,
  spec?: ConversionSpec,
): void {
  if (source !== 'video' && spec && spec.kind !== source) {
    throw new ConversionServiceError(
      'unsupported',
      'Invalid source/target operation',
    );
  }

  const capability = capabilities[spec?.kind ?? source].find(
    (entry) => entry.format === format && entry.available,
  );
  if (!capability) {
    throw new ConversionServiceError(
      'unsupported',
      'Output encoder unavailable',
    );
  }

  if (
    spec &&
    spec.kind !== 'image' &&
    spec.codec !== 'default' &&
    !capability.codecs?.includes(spec.codec)
  ) {
    throw new ConversionServiceError(
      'unsupported',
      'Requested codec is unavailable',
    );
  }
}

/** Export only domain fields, never adapter paths or File/Blob handles. */
export function serializeQueue(queue: ConversionQueue): string {
  if (!Number.isSafeInteger(queue.revision) || queue.revision < 0) {
    throw new Error('Invalid queue revision');
  }

  return JSON.stringify({
    revision: queue.revision,
    batches: queue.batches.map(({ id, mediaType, jobIds }) => ({
      id,
      mediaType,
      jobIds: [...jobIds],
    })),
    jobs: queue.jobs.map((job) => ({
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
      metadata: job.metadata,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error
        ? { code: job.error.code, message: job.error.message }
        : undefined,
    })),
  });
}
