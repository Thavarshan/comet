import { z } from 'zod';
import { conversionSchema, type ConversionSpec } from './conversion.js';

export {
  conversionSchema,
  defaultConversion,
  type ConversionSpec,
} from './conversion.js';

// Avoid dynamic code generation in sandboxed renderers with a strict CSP.
z.config({ jitless: true });

export const mediaTypes = ['video', 'audio', 'image'] as const;

export type MediaType = (typeof mediaTypes)[number];

export const locales = ['en', 'es', 'fr', 'de', 'ru'] as const;

export type Locale = (typeof locales)[number];

export type Theme = 'light' | 'dark' | 'system';

export const terminalStates = ['succeeded', 'failed', 'canceled'] as const;

export type JobState =
  | 'queued'
  | 'running'
  | 'canceling'
  | (typeof terminalStates)[number];

/**
 * Identify states whose output and cleanup can no longer change.
 */
export const isTerminal = (state: JobState): boolean =>
  (terminalStates as readonly string[]).includes(state);

export const formats: Record<MediaType, readonly string[]> = {
  video: [
    'mp4',
    'webm',
    'flv',
    'avi',
    'mov',
    'wmv',
    '3gp',
    'mkv',
    'm4v',
    'mpg',
    'mpeg',
    'vob',
    'ts',
    'asf',
    'f4v',
    'h264',
    'hevc',
    'm2ts',
    'm2v',
    'mts',
    'ogv',
    'rm',
    'swf',
  ],
  audio: [
    'mp3',
    'wav',
    'ogg',
    'm4a',
    'flac',
    'wma',
    'aac',
    'amr',
    'aiff',
    'au',
    'mka',
    'ac3',
    'ape',
    'mpc',
    'opus',
    'wv',
    'caf',
    'tta',
    'eac3',
    'mp2',
  ],
  image: ['jpg', 'png', 'bmp', 'gif', 'tiff', 'jpeg', 'webp', 'avif'],
};

export const inputExtensions: Record<MediaType, readonly string[]> = {
  video: [...formats.video, 'mxf', 'xvid', '3g2'],
  audio: [...formats.audio, 'aif', 'oga', 'mp2'],
  image: [...formats.image, 'tif'],
};

export const defaults: Record<MediaType, string> = {
  video: 'mp4',
  audio: 'mp3',
  image: 'jpg',
};

/**
 * Match a filename against accepted inputs, ignoring extension case.
 */
export function acceptsFile(media: MediaType, name: string): boolean {
  return inputExtensions[media].includes(
    name.split('.').at(-1)?.toLowerCase() ?? '',
  );
}

const safePath = z
  .string()
  .min(1)
  .max(32768)
  .refine(
    (value) => !value.includes('\0') && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value),
    'Local paths only',
  );

export const fileSchema = z
  .object({
    itemId: z.string().min(1).max(100),
    inputPath: safePath,
    name: z.string().min(1).max(1024),
    sizeBytes: z.number().int().nonnegative(),
  })
  .strict();

export type SourceFile = z.infer<typeof fileSchema>;

export const batchSchema = z
  .object({
    mediaType: z.enum(mediaTypes),
    items: z.array(fileSchema).min(1).max(1000),
    outputFormat: z.string().min(1).max(16),
    outputDirectory: safePath,
    spec: conversionSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const target = value.spec?.kind ?? value.mediaType;
    if (value.mediaType !== 'video' && target !== value.mediaType) {
      context.addIssue({
        code: 'custom',
        message: 'Invalid source/target operation',
      });
    }

    if (!formats[target].includes(value.outputFormat)) {
      context.addIssue({
        code: 'custom',
        message: 'Unsupported output format',
      });
    }

    if (
      new Set(value.items.map((item) => item.itemId)).size !==
      value.items.length
    ) {
      context.addIssue({ code: 'custom', message: 'Duplicate item IDs' });
    }
  });

export type BatchRequest = z.infer<typeof batchSchema>;

/**
 * Serializable source information obtained through validated native probing.
 */
export interface MediaMetadata {
  duration: number | null;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  frames: number | null;
  audio: {
    track: number;
    codec: string;
    channels: number | null;
    sampleRate: number | null;
    language: string | null;
  }[];
}

/**
 * A submitted file with immutable settings and engine-owned progress.
 */
export interface Job extends SourceFile {
  id: string;
  batchId: string;
  mediaType: MediaType;
  outputFormat: string;
  outputDirectory: string;
  spec?: ConversionSpec | undefined;
  metadata?: MediaMetadata;
  startedAt?: number;
  completedAt?: number;
  state: JobState;
  progress: number | null;
  outputPath?: string;
  error?: { code: string; message: string };
}

/**
 * An ordered submission belonging to one media category.
 */
export interface Batch {
  id: string;
  mediaType: MediaType;
  jobIds: string[];
}

/**
 * A detached queue view; consumers must discard older revisions.
 */
export interface QueueSnapshot {
  revision: number;
  batches: Batch[];
  jobs: Job[];
}

/**
 * The outcome after cancellation has finished any native cleanup.
 */
export interface CancelResult {
  status: 'canceled' | 'already-terminal' | 'not-found';
}

/**
 * An output format and its availability in the bundled native tools.
 */
export interface Capability {
  format: string;
  available: boolean;
  reason?: string;
  codecs?: string[];
}

export type Capabilities = Record<MediaType, Capability[]>;

export const idSchema = z.string().uuid();

const mediaPreference = (media: MediaType) =>
  z
    .object({
      format: z.string(),
      directory: safePath,
      spec: conversionSchema.optional(),
    })
    .strict()
    .superRefine((value, context) => {
      const target = value.spec?.kind ?? media;
      if (
        (media !== 'video' && target !== media) ||
        !formats[target].includes(value.format)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Invalid output preference',
        });
      }
    });

export const preferencesSchema = z
  .object({
    version: z.literal(2),
    locale: z.enum(locales),
    theme: z.enum(['light', 'dark', 'system']),
    legacyImported: z.boolean(),
    media: z
      .object({
        video: mediaPreference('video'),
        audio: mediaPreference('audio'),
        image: mediaPreference('image'),
      })
      .strict(),
  })
  .strict();

export type Preferences = z.infer<typeof preferencesSchema>;

export const legacySchema = z
  .object({
    locale: z.enum(locales).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  })
  .strict();

/**
 * Upgrade the canonical v1 profile in place, preserving appearance and paths.
 */
export function migratePreferences(input: unknown): Preferences {
  if (
    typeof input === 'object' &&
    input !== null &&
    'version' in input &&
    input.version === 1
  ) {
    return preferencesSchema.parse({ ...input, version: 2 });
  }

  return preferencesSchema.parse(input);
}

/**
 * Build a fresh preference profile without restoring conversion jobs.
 */
export function defaultPreferences(directory: string): Preferences {
  return {
    version: 2,
    locale: 'en',
    theme: 'system',
    legacyImported: false,
    media: {
      video: { format: 'mp4', directory },
      audio: { format: 'mp3', directory },
      image: { format: 'jpg', directory },
    },
  };
}

export const channels = {
  environment: 'comet:environment',
  preferences: 'comet:preferences',
  savePreferences: 'comet:save-preferences',
  importLegacy: 'comet:import-legacy',
  directory: 'comet:directory',
  enqueue: 'comet:enqueue',
  cancelJob: 'comet:cancel-job',
  cancelBatch: 'comet:cancel-batch',
  snapshot: 'comet:snapshot',
  removeItem: 'comet:remove-item',
  clearMedia: 'comet:clear-media',
  queueChanged: 'comet:queue-changed',
  themeChanged: 'comet:theme-changed',
  titlebar: 'comet:titlebar',
  show: 'comet:show',
  reveal: 'comet:reveal',
  inspect: 'comet:inspect',
  cancelInspection: 'comet:cancel-inspection',
} as const;

export type Reply<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };

/**
 * Desktop metadata needed by the renderer without exposing Node APIs.
 */
export interface Environment {
  platform: string;
  systemTheme: 'light' | 'dark';
  capabilities: Capabilities;
  version: string;
}

/**
 * The only renderer-facing desktop API; subscriptions own their cleanup.
 */
export interface DesktopBridge<FileType = unknown> {
  getEnvironment(): Promise<Reply<Environment>>;
  getPreferences(): Promise<Reply<Preferences>>;
  savePreferences(preferences: Preferences): Promise<Reply<Preferences>>;
  importLegacyPreferences(
    legacy: z.infer<typeof legacySchema>,
  ): Promise<Reply<Preferences>>;
  selectDirectory(media?: MediaType): Promise<Reply<string | null>>;
  getFilePath(file: FileType): string;
  enqueueBatch(request: BatchRequest): Promise<Reply<QueueSnapshot>>;
  cancelJob(id: string): Promise<Reply<CancelResult>>;
  cancelBatch(id: string): Promise<Reply<CancelResult>>;
  removeItem(itemId: string): Promise<Reply<QueueSnapshot>>;
  clearMedia(media: MediaType): Promise<Reply<QueueSnapshot>>;
  getSnapshot(): Promise<Reply<QueueSnapshot>>;
  onQueueChanged(callback: (snapshot: QueueSnapshot) => void): () => void;
  onThemeChanged(callback: (theme: 'light' | 'dark') => void): () => void;
  titlebarDoubleClick(): Promise<Reply<void>>;
  showWindow(): Promise<Reply<void>>;
  revealOutput(id: string): Promise<Reply<void>>;
  inspectFile(file: SourceFile): Promise<Reply<MediaMetadata>>;
  cancelInspection(itemId: string): Promise<Reply<void>>;
}

/**
 * Return a successful command value or throw its structured error.
 */
export function unwrap<T>(reply: Reply<T>): T {
  if (!reply.ok) {
    throw Object.assign(new Error(reply.error.message), {
      code: reply.error.code,
    });
  }

  return reply.value;
}

export type {
  ReleaseAsset,
  PublishedRelease,
  ReleaseManifest,
} from './releases.js';
