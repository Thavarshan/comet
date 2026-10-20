import type {
  ConversionQueue,
  ConversionService,
  InputFile,
  OutputTarget,
} from '@honeymelon/core';
import type { ConversionSpec, Locale, MediaType } from '@honeymelon/contracts';

/** A user-facing destination label, separate from its platform-owned handle. */
export interface Destination {
  target: OutputTarget;
  label: string;
  description?: string;
}

/** Output preferences for the next submission, never for a running job. */
export interface ConverterSettings {
  format: string;
  spec?: ConversionSpec | undefined;
  destination: Destination;
}

/** Portable preferences; hosts own persistence, theme, and localization. */
export interface ConverterPreferences {
  locale: Locale;
  media: Record<MediaType, ConverterSettings>;
}

/** Metadata-only queue row, with no File/Blob or filesystem path. */
export interface DraftFile {
  itemId: string;
  name: string;
  sizeBytes: number;
}

/**
 * Host interactions sit beside the conversion service, not inside shared UI.
 * Omit optional actions when a platform cannot offer them.
 */
export interface ConverterPlatform {
  service: ConversionService;
  mediaTypes?: readonly MediaType[];
  intake(files: File[]): InputFile[];
  removeItem(id: string): Promise<ConversionQueue>;
  clearMedia(media: MediaType): Promise<ConversionQueue>;
  selectDestination?(media: MediaType): Promise<Destination | null>;
  outputAction?: {
    kind: 'reveal' | 'download';
    label(): string;
    run(id: string): Promise<void>;
  };
  describeInput?(id: string): string | undefined;
}
