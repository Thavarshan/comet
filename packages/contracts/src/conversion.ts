import { z } from 'zod';

const quality = z.enum(['small', 'balanced', 'high']).default('balanced');
const dimensions = {
  width: z.number().int().min(16).max(8192).optional(),
  height: z.number().int().min(16).max(8192).optional(),
};

/**
 * Versioned, allowlisted conversion settings. No native flags cross IPC.
 */
export const conversionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('video'),
      codec: z
        .enum(['default', 'h264', 'hevc', 'vp9', 'av1', 'prores'])
        .default('default'),
      quality,
      speed: z.enum(['fast', 'medium', 'slow']).default('medium'),
      ...dimensions,
      frameRate: z.number().min(1).max(120).optional(),
      includeAudio: z.boolean().default(true),
    })
    .strict(),
  z
    .object({
      kind: z.literal('audio'),
      codec: z.enum(['default', 'alac']).default('default'),
      bitrate: z.number().int().min(32).max(320).optional(),
      sampleRate: z
        .union([
          z.literal(22050),
          z.literal(44100),
          z.literal(48000),
          z.literal(96000),
        ])
        .optional(),
      channels: z.union([z.literal(1), z.literal(2)]).optional(),
      bitDepth: z.union([z.literal(16), z.literal(24)]).optional(),
      track: z.number().int().min(0).max(31).default(0),
    })
    .strict(),
  z
    .object({
      kind: z.literal('image'),
      quality: z.number().int().min(1).max(100).default(85),
      lossless: z.boolean().default(false),
      ...dimensions,
      timestamp: z.number().min(0).max(86400).default(0),
      allowFlatten: z.boolean().default(false),
      background: z
        .string()
        .regex(/^#[\da-f]{6}$/i)
        .default('#ffffff'),
    })
    .strict(),
]);

export type ConversionSpec = z.infer<typeof conversionSchema>;

/**
 * Resolve conservative defaults for existing extension-only preferences.
 */
export function defaultConversion(
  kind: ConversionSpec['kind'],
): ConversionSpec {
  return conversionSchema.parse({ kind });
}
