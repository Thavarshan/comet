import type { ConversionSpec } from '@honeymelon/contracts';
import { profiles, type EncodingProfile } from './profiles.js';

const videoEncoders = {
  h264: 'libx264',
  hevc: 'libx265',
  vp9: 'libvpx-vp9',
  av1: 'libaom-av1',
  prores: 'prores_ks',
};

/**
 * Resolve an extension and validated option set to compatible native codecs.
 * The same resolver is used for submission checks and actual execution.
 */
export function resolveEncoding(
  format: string,
  spec: ConversionSpec,
): EncodingProfile {
  const base = profiles[format];
  if (spec.kind === 'image') {
    const encoders: Record<string, string> = {
      jpg: 'mjpeg',
      jpeg: 'mjpeg',
      png: 'png',
      bmp: 'bmp',
      tiff: 'tiff',
      gif: 'gif',
      webp: 'libwebp',
      avif: 'libaom-av1',
    };
    const video = encoders[format];
    if (!video) {
      throw new Error('Image format unavailable');
    }

    return { muxer: format === 'avif' ? 'avif' : 'image2', video };
  }

  if (!base) {
    throw new Error('Output encoder unavailable');
  }

  const profile = { ...base };
  if (spec.kind === 'video' && spec.codec !== 'default') {
    const compatible: Record<string, string[]> = {
      mp4: ['h264', 'hevc', 'av1'],
      mkv: ['h264', 'hevc', 'vp9', 'av1'],
      mov: ['h264', 'hevc', 'prores'],
      webm: ['vp9', 'av1'],
    };
    if (!compatible[format]?.includes(spec.codec)) {
      throw new Error('Codec is not compatible with this container');
    }

    profile.video = videoEncoders[spec.codec];
    if (spec.codec === 'prores') {
      profile.audio = 'pcm_s16le';
    }
  }

  if (spec.kind === 'audio') {
    if (format === 'amr' && (spec.sampleRate || spec.channels === 2)) {
      throw new Error('AMR requires 8000 Hz mono audio');
    }

    if (spec.codec === 'alac') {
      if (!['m4a', 'caf'].includes(format)) {
        throw new Error('Apple Lossless requires M4A or CAF');
      }

      profile.audio = 'alac';
    }

    if (
      spec.bitrate &&
      ![
        'mp3',
        'aac',
        'm4a',
        'opus',
        'ogg',
        'wma',
        'mp2',
        'ac3',
        'eac3',
      ].includes(format)
    ) {
      throw new Error('Bitrate does not apply to lossless output');
    }

    if (spec.bitrate && spec.codec === 'alac') {
      throw new Error('Bitrate does not apply to Apple Lossless');
    }

    if (spec.bitDepth) {
      if (!['wav', 'aiff', 'caf'].includes(format) || spec.codec === 'alac') {
        throw new Error('Bit depth is only supported for PCM output');
      }

      profile.audio = `pcm_s${spec.bitDepth}${format === 'aiff' ? 'be' : 'le'}`;
    }
  }

  return profile;
}

/**
 * Translate a finite, typed option set to allowlisted argument arrays.
 */
export function encodingArguments(
  format: string,
  spec: ConversionSpec,
  profile: EncodingProfile,
): string[] {
  const args: string[] = [];
  if (spec.kind === 'video') {
    args.push('-map', '0:v:0', '-c:v', profile.video!);
    if (spec.includeAudio && profile.audio) {
      args.push('-map', '0:a:0?', '-c:a', profile.audio);
      if (format === 'swf') {
        // SWF's MP3 audio cannot carry the 48 kHz used by WebM/Opus sources.
        args.push('-ar', '44100');
      }
    } else {
      args.push('-an');
    }

    const quality = { small: 30, balanced: 23, high: 18 }[spec.quality];
    if (['libx264', 'libx265'].includes(profile.video!)) {
      args.push('-crf', String(quality), '-preset', spec.speed);
      args.push('-pix_fmt', 'yuv420p');
    } else if (['libvpx-vp9', 'libaom-av1'].includes(profile.video!)) {
      args.push('-crf', String(quality + 7), '-b:v', '0');
      const speed =
        profile.video === 'libaom-av1'
          ? { fast: 8, medium: 6, slow: 4 }[spec.speed]
          : { fast: 6, medium: 3, slow: 0 }[spec.speed];
      args.push('-cpu-used', String(speed));
    } else if (profile.video === 'prores_ks') {
      args.push(
        '-profile:v',
        String({ small: 0, balanced: 2, high: 3 }[spec.quality]),
        '-pix_fmt',
        'yuv422p10le',
      );
    }

    if (spec.width || spec.height) {
      args.push('-vf', scaleFilter(spec.width, spec.height, true));
    }

    if (spec.frameRate) {
      args.push('-r', String(spec.frameRate));
    }

    if (format === 'mp4') {
      args.push('-movflags', '+faststart');
    }
  } else if (spec.kind === 'audio') {
    args.push('-map', `0:a:${spec.track}`, '-vn', '-c:a', profile.audio!);
    if (profile.audio === 'wavpack') {
      // Gapless MP3 can start below WavPack's 128-sample block minimum.
      // Set a block size without padding or trimming the decoded audio.
      args.push('-frame_size', '4096');
    }

    if (format === 'amr') {
      // AMR-NB is a speech codec with fixed rate/channel requirements.
      args.push('-ar', '8000', '-ac', '1', '-b:a', '12200');
    }

    if (spec.bitrate) {
      args.push('-b:a', `${spec.bitrate}k`);
    }

    if (format === 'eac3' && !spec.sampleRate) {
      // 48 kHz keeps short narrowband clips detectable as raw E-AC-3.
      args.push('-ar', '48000');
    }

    if (spec.sampleRate) {
      args.push('-ar', String(spec.sampleRate));
    }

    if (spec.channels) {
      args.push('-ac', String(spec.channels));
    }
  } else {
    args.push('-map', '0:v:0', '-an', '-frames:v', '1', '-c:v', profile.video!);
    if (spec.width || spec.height) {
      args.push('-vf', scaleFilter(spec.width, spec.height, false));
    }

    if (format === 'webp') {
      args.push(
        '-quality',
        String(spec.quality),
        '-lossless',
        spec.lossless ? '1' : '0',
      );
    } else if (format === 'avif') {
      args.push(
        '-crf',
        spec.lossless ? '0' : String(Math.round((100 - spec.quality) * 0.63)),
        '-cpu-used',
        '6',
      );
    } else if (['jpg', 'jpeg'].includes(format)) {
      args.push(
        '-q:v',
        String(Math.max(2, Math.round((100 - spec.quality) * 0.29 + 2))),
      );
    }
  }

  return args;
}

function scaleFilter(
  width: number | undefined,
  height: number | undefined,
  even: boolean,
): string {
  return (
    `scale=w='min(iw,${width ?? 8192})'` +
    `:h='min(ih,${height ?? 8192})':force_original_aspect_ratio=decrease` +
    (even ? ':force_divisible_by=2' : '')
  );
}
