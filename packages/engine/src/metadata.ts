import { z } from 'zod';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import type { MediaMetadata } from '@comet/contracts';
import { runProcess } from './process.js';

const streamSchema = z.object({
  index: z.number(),
  codec_type: z.string().optional(),
  codec_name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  sample_rate: z.string().optional(),
  channels: z.number().optional(),
  nb_frames: z.string().optional(),
  nb_read_frames: z.string().optional(),
  pix_fmt: z.string().optional(),
  tags: z.object({ language: z.string().optional() }).optional(),
  disposition: z.object({ attached_pic: z.number().optional() }).optional(),
});

const probeSchema = z.object({
  format: z.object({ duration: z.string().optional() }).optional(),
  streams: z.array(streamSchema).default([]),
});

/**
 * Parse tool output at the native boundary rather than asserting JSON shapes.
 * The host scheduler is responsible for reserving a single native slot.
 */
export async function probeFile(
  executable: string,
  filename: string,
  signal: AbortSignal,
  countFrames = false,
): Promise<MediaMetadata> {
  if (!path.isAbsolute(filename) || !(await stat(filename)).isFile()) {
    throw new Error('Input must be an existing local file');
  }

  const result = await runProcess(
    executable,
    [
      '-v',
      'error',
      '-protocol_whitelist',
      'file,pipe',
      ...(countFrames ? ['-count_frames'] : []),
      '-show_format',
      '-show_streams',
      '-of',
      'json',
      filename,
    ],
    signal,
  );
  const data = probeSchema.parse(JSON.parse(result.stdout));
  const video = data.streams.find(
    (stream) =>
      stream.codec_type === 'video' && !stream.disposition?.attached_pic,
  );
  const audio = data.streams.filter((stream) => stream.codec_type === 'audio');
  const duration = Number(data.format?.duration);

  return {
    duration: Number.isFinite(duration) && duration > 0 ? duration : null,
    width: video?.width ?? null,
    height: video?.height ?? null,
    videoCodec: video?.codec_name ?? null,
    frames: Number(video?.nb_read_frames ?? video?.nb_frames) || null,
    audio: audio.map((stream, track) => ({
      track,
      codec: stream.codec_name ?? 'unknown',
      channels: stream.channels ?? null,
      sampleRate: Number(stream.sample_rate) || null,
      language: stream.tags?.language ?? null,
    })),
  };
}
