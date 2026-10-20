import type {
  CancelResult,
  Capabilities,
  ConversionSpec,
  MediaMetadata,
  MediaType,
} from '@honeymelon/contracts';
import type { ConversionQueue } from './index.js';

/** Serializable identity; each platform retains its own file handle. */
export interface InputFile {
  id: string;
  name: string;
  sizeBytes: number;
}

/** An opaque destination, resolved exclusively by the platform adapter. */
export interface OutputTarget {
  id: string;
}

/** Immutable submission data shared by desktop and browser workflows. */
export interface ConversionRequest {
  mediaType: MediaType;
  files: InputFile[];
  target: OutputTarget;
  outputFormat: string;
  spec?: ConversionSpec | undefined;
}

/**
 * A platform owns handles, execution, progress, and resource cleanup.
 * Subscribe before fetching a snapshot and accept only newer revisions.
 */
export interface ConversionService {
  discoverCapabilities(): Promise<Capabilities>;
  probe(file: InputFile, signal?: AbortSignal): Promise<MediaMetadata>;
  enqueue(request: ConversionRequest): Promise<ConversionQueue>;
  getSnapshot(): Promise<ConversionQueue>;
  subscribe(listener: (queue: ConversionQueue) => void): () => void;
  cancelJob(id: string): Promise<CancelResult>;
  cancelBatch(id: string): Promise<CancelResult>;
  dispose(): Promise<void>;
}

/** Stable error categories that do not depend on platform error messages. */
export type ConversionErrorCode =
  | 'unsupported'
  | 'invalid-input'
  | 'invalid-target'
  | 'canceled'
  | 'disposed'
  | 'conversion-failed';

/** Command failures carry actionable categories across platform adapters. */
export class ConversionServiceError extends Error {
  constructor(
    readonly code: ConversionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ConversionServiceError';
  }
}

/** Cancellation is expected; other failures require a user decision. */
export function classifyConversionError(error: unknown): {
  code: ConversionErrorCode;
  recoverable: boolean;
} {
  let code: ConversionErrorCode = 'conversion-failed';
  if (error instanceof ConversionServiceError) {
    code = error.code;
  } else if (error instanceof Error && error.name === 'AbortError') {
    code = 'canceled';
  }

  return { code, recoverable: code !== 'disposed' };
}

/** Produce a filename only; adapters still resolve collisions atomically. */
export function outputFilename(name: string, format: string): string {
  if (!/^[a-z0-9]{1,16}$/.test(format)) {
    throw new ConversionServiceError('unsupported', 'Invalid output format');
  }

  const basename = name.split(/[\\/]/).at(-1) ?? '';
  const stem = basename.replace(/\.[^.]*$/, '').replace(/\p{Cc}/gu, '');

  return `${stem || 'output'}.${format}`;
}
