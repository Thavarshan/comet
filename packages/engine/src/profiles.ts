import { formats, type Capabilities } from '@honeymelon/contracts';
import { runProcess } from './process.js';

/**
 * Explicit codec and container choices for one output extension.
 */
export interface EncodingProfile {
  muxer: string;
  video?: string;
  audio?: string;
}

export const profiles: Record<string, EncodingProfile> = {
  mp4: { muxer: 'mp4', video: 'libx264', audio: 'aac' },
  mkv: { muxer: 'matroska', video: 'libx264', audio: 'aac' },
  webm: { muxer: 'webm', video: 'libvpx-vp9', audio: 'libopus' },
  flv: { muxer: 'flv', video: 'libx264', audio: 'aac' },
  avi: { muxer: 'avi', video: 'mpeg4', audio: 'libmp3lame' },
  mov: { muxer: 'mov', video: 'libx264', audio: 'aac' },
  wmv: { muxer: 'asf', video: 'wmv2', audio: 'wmav2' },
  '3gp': { muxer: '3gp', video: 'mpeg4', audio: 'aac' },
  m4v: { muxer: 'ipod', video: 'libx264', audio: 'aac' },
  mpg: { muxer: 'mpeg', video: 'mpeg1video', audio: 'mp2' },
  mpeg: { muxer: 'mpeg', video: 'mpeg2video', audio: 'mp2' },
  vob: { muxer: 'vob', video: 'mpeg2video', audio: 'ac3' },
  ts: { muxer: 'mpegts', video: 'mpeg2video', audio: 'mp2' },
  asf: { muxer: 'asf', video: 'wmv2', audio: 'wmav2' },
  f4v: { muxer: 'f4v', video: 'libx264', audio: 'aac' },
  h264: { muxer: 'h264', video: 'libx264' },
  hevc: { muxer: 'hevc', video: 'libx265' },
  m2ts: { muxer: 'mpegts', video: 'mpeg2video', audio: 'ac3' },
  m2v: { muxer: 'mpeg2video', video: 'mpeg2video' },
  mts: { muxer: 'mpegts', video: 'mpeg2video', audio: 'ac3' },
  ogv: { muxer: 'ogg', video: 'libtheora', audio: 'libvorbis' },
  rm: { muxer: 'rm', video: 'rv10', audio: 'ac3' },
  swf: { muxer: 'swf', video: 'flv', audio: 'libmp3lame' },
  mp3: { muxer: 'mp3', audio: 'libmp3lame' },
  wav: { muxer: 'wav', audio: 'pcm_s16le' },
  ogg: { muxer: 'ogg', audio: 'libvorbis' },
  m4a: { muxer: 'ipod', audio: 'aac' },
  flac: { muxer: 'flac', audio: 'flac' },
  wma: { muxer: 'asf', audio: 'wmav2' },
  aac: { muxer: 'adts', audio: 'aac' },
  amr: { muxer: 'amr', audio: 'libopencore_amrnb' },
  aiff: { muxer: 'aiff', audio: 'pcm_s16be' },
  au: { muxer: 'au', audio: 'pcm_s16be' },
  mka: { muxer: 'matroska', audio: 'libopus' },
  ac3: { muxer: 'ac3', audio: 'ac3' },
  opus: { muxer: 'opus', audio: 'libopus' },
  wv: { muxer: 'wv', audio: 'wavpack' },
  caf: { muxer: 'caf', audio: 'pcm_s16le' },
  tta: { muxer: 'tta', audio: 'tta' },
  eac3: { muxer: 'eac3', audio: 'eac3' },
  mp2: { muxer: 'mp2', audio: 'mp2' },
};

/**
 * Discover output availability from the actual bundled encoder and muxer
 * lists.
 */
export async function detectCapabilities(
  ffmpegPath: string,
): Promise<Capabilities> {
  const signal = AbortSignal.timeout(15000);
  const [encoders, muxers] = await Promise.all([
    runProcess(ffmpegPath, ['-hide_banner', '-encoders'], signal),
    runProcess(ffmpegPath, ['-hide_banner', '-muxers'], signal),
  ]);
  const encoderNames = new Set(
    [...encoders.stdout.matchAll(/^\s*[VAS][A-Z.]{5}\s+(\S+)/gm)].map(
      (match) => match[1],
    ),
  );
  const muxerNames = new Set(
    [...muxers.stdout.matchAll(/^\s*E\s+(\S+)/gm)].flatMap((match) =>
      match[1]!.split(','),
    ),
  );

  const codecNames: Record<string, string> = {
    h264: 'libx264',
    hevc: 'libx265',
    vp9: 'libvpx-vp9',
    av1: 'libaom-av1',
    prores: 'prores_ks',
  };
  const containers: Record<string, string[]> = {
    mp4: ['h264', 'hevc', 'av1'],
    mkv: ['h264', 'hevc', 'vp9', 'av1'],
    mov: ['h264', 'hevc', 'prores'],
    webm: ['vp9', 'av1'],
  };
  const result: Capabilities = { video: [], audio: [], image: [] };
  for (const media of ['video', 'audio', 'image'] as const) {
    for (const format of formats[media]) {
      const profile = profiles[format];
      let available = false;
      let codecs: string[] = [];
      if (media === 'image') {
        available = true;
        if (['webp', 'avif'].includes(format)) {
          available =
            encoderNames.has(format === 'webp' ? 'libwebp' : 'libaom-av1') &&
            muxerNames.has(format === 'avif' ? 'avif' : 'image2');
        }
      } else if (profile) {
        available =
          muxerNames.has(profile.muxer) &&
          [profile.video, profile.audio]
            .filter(Boolean)
            .every((name) => encoderNames.has(name!));
      }

      if (media === 'video') {
        codecs = (containers[format] ?? []).filter((codec) =>
          encoderNames.has(codecNames[codec] ?? ''),
        );
      } else if (
        media === 'audio' &&
        ['m4a', 'caf'].includes(format) &&
        encoderNames.has('alac')
      ) {
        codecs = ['alac'];
      }

      result[media].push({
        format,
        available,
        codecs,
        ...(!available ? { reason: 'ENCODER_UNAVAILABLE' } : {}),
      });
    }
  }

  return result;
}
