import { randomUUID, createHash } from 'node:crypto';
import { chmod, copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  createExecutor,
  detectCapabilities,
  runProcess,
  type EnginePaths,
} from '@honeymelon/engine';
import {
  defaultConversion,
  inputExtensions,
  type Capabilities,
  type ConversionSpec,
  type Job,
  type MediaType,
} from '@honeymelon/contracts';

/** A real, independently probeable media stream. */
export const streamSchema = z.object({
  codec_type: z.string(),
  codec_name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  channels: z.number().optional(),
});

/** Validated metadata used for both desktop and native assertions. */
export const mediaSchema = z.object({ streams: z.array(streamSchema) });

/** Provenance and a byte-level preservation check for one source fixture. */
export interface MediaFixture {
  media: MediaType;
  format: string;
  filename: string;
  sha256: string;
  hasAudio: boolean;
  provenance: 'generated' | 'alias' | 'external';
}

/** A missing fixture is a coverage gap, not proof of decoder support. */
export interface FixtureGap {
  media: MediaType;
  format: string;
  reason: string;
}

/** Runtime capabilities and reproducible fixtures for the native target. */
export interface MatrixFixtures {
  capabilities: Capabilities;
  fixtures: Map<string, MediaFixture>;
  gaps: FixtureGap[];
}

/** Give every native operation a bounded lifetime, including fixture setup. */
export function mediaSignal(): AbortSignal {
  return AbortSignal.timeout(20000);
}

/** Create the same serializable request shape accepted by the engine. */
export function conversionJob(
  mediaType: MediaType,
  inputPath: string,
  outputFormat: string,
  outputDirectory: string,
  spec: ConversionSpec = defaultConversion(mediaType),
): Job {
  return {
    id: randomUUID(),
    batchId: randomUUID(),
    itemId: randomUUID(),
    inputPath,
    name: path.basename(inputPath),
    sizeBytes: 1,
    mediaType,
    outputFormat,
    outputDirectory,
    spec,
    state: 'running',
    progress: 0,
  };
}

/** Inspect bytes rather than assuming that an output extension is truthful. */
export async function inspectMedia(
  paths: EnginePaths,
  filename: string,
): Promise<z.infer<typeof mediaSchema>> {
  const probe = await runProcess(
    paths.ffprobePath,
    ['-v', 'error', '-show_streams', '-of', 'json', filename],
    mediaSignal(),
  );

  return mediaSchema.parse(JSON.parse(probe.stdout));
}

/** Decode an entire output so truncated or undecodable payloads fail tests. */
export async function verifyMedia(
  paths: EnginePaths,
  filename: string,
  media: MediaType,
): Promise<void> {
  if ((await stat(filename)).size === 0) {
    throw new Error('Empty conversion output');
  }

  const metadata = await inspectMedia(paths, filename);
  const streamType = media === 'audio' ? 'audio' : 'video';
  if (
    !metadata.streams.some(
      (stream) =>
        stream.codec_type === streamType && Boolean(stream.codec_name),
    )
  ) {
    throw new Error(`Output has no ${streamType} stream`);
  }

  await runProcess(
    paths.ffmpegPath,
    [
      '-nostdin',
      '-v',
      'error',
      '-xerror',
      '-i',
      filename,
      '-map',
      `0:${streamType === 'audio' ? 'a' : 'v'}:0`,
      '-f',
      'null',
      '-',
    ],
    mediaSignal(),
  );
}

/** Hash fixtures before conversion, including externally supplied samples. */
export async function mediaDigest(filename: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(filename))
    .digest('hex');
}

/** Generate portable, opaque test media using only the staged native tools. */
export async function createSeedMedia(
  directory: string,
  paths: EnginePaths,
): Promise<Record<MediaType, string>> {
  await mkdir(directory, { recursive: true });
  const seeds = {
    video: path.join(directory, 'seed ü video.mp4'),
    audio: path.join(directory, 'seed ü audio.wav'),
    image: path.join(directory, 'seed ü image.png'),
  };
  const native = async (args: string[]) => {
    await runProcess(
      paths.ffmpegPath,
      ['-nostdin', '-v', 'error', ...args],
      mediaSignal(),
    );
  };

  await native([
    '-f',
    'lavfi',
    '-i',
    'color=c=blue:s=176x144:r=25',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=44100',
    '-t',
    '0.24',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-ac',
    '2',
    seeds.video,
  ]);
  await native([
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=44100',
    '-t',
    '0.24',
    '-ac',
    '2',
    seeds.audio,
  ]);
  await native([
    '-f',
    'lavfi',
    '-i',
    'color=c=blue:s=16x16',
    '-frames:v',
    '1',
    seeds.image,
  ]);

  return seeds;
}

/** Snapshot executables so packaging cannot replace a tool during a test. */
export async function snapshotNativeTools(
  directory: string,
  paths: EnginePaths,
): Promise<EnginePaths> {
  await mkdir(directory, { recursive: true });
  const ffmpegPath = path.join(directory, path.basename(paths.ffmpegPath));
  const ffprobePath = path.join(directory, path.basename(paths.ffprobePath));
  await Promise.all([
    copyFile(paths.ffmpegPath, ffmpegPath),
    copyFile(paths.ffprobePath, ffprobePath),
  ]);
  await Promise.all([chmod(ffmpegPath, 0o755), chmod(ffprobePath, 0o755)]);

  return { ...paths, ffmpegPath, ffprobePath };
}

/**
 * Produce small Unicode/space-path fixtures without network downloads.
 * Input-only encodings need explicit external samples; never rename unrelated
 * bytes just to claim that their decoder was exercised.
 */
export async function createMatrixFixtures(
  directory: string,
  paths: EnginePaths,
): Promise<MatrixFixtures> {
  await mkdir(directory, { recursive: true });
  const capabilities = await detectCapabilities(paths.ffmpegPath);
  const fixtures = new Map<string, MediaFixture>();
  const gaps: FixtureGap[] = [];
  const execute = createExecutor(paths);
  const seeds = await createSeedMedia(directory, paths);
  const native = async (args: string[]) => {
    await runProcess(
      paths.ffmpegPath,
      ['-nostdin', '-v', 'error', ...args],
      mediaSignal(),
    );
  };

  const remember = async (
    media: MediaType,
    format: string,
    filename: string,
    provenance: MediaFixture['provenance'],
  ) => {
    const probe = await inspectMedia(paths, filename);
    if (provenance === 'external') {
      const inputOnlyCodecs: Record<string, string[]> = {
        amr: ['amr_nb', 'amr_wb'],
        ape: ['ape'],
        mpc: ['musepack7', 'musepack8'],
      };
      const expected = inputOnlyCodecs[format];
      if (
        expected &&
        !probe.streams.some((stream) =>
          expected.includes(stream.codec_name ?? ''),
        )
      ) {
        throw new Error(`External ${format} fixture has the wrong codec`);
      }
    }

    await verifyMedia(paths, filename, media);
    fixtures.set(`${media}/${format}`, {
      media,
      format,
      filename,
      provenance,
      sha256: await mediaDigest(filename),
      hasAudio: probe.streams.some((stream) => stream.codec_type === 'audio'),
    });
  };

  for (const media of ['video', 'audio', 'image'] as const) {
    const destination = path.join(directory, media);
    await mkdir(destination);
    for (const capability of capabilities[media]) {
      if (!capability.available) {
        continue;
      }

      const output = await execute(
        conversionJob(media, seeds[media], capability.format, destination),
        mediaSignal(),
        () => {},
      );
      await remember(media, capability.format, output, 'generated');
    }
  }

  const aliases = {
    video: { xvid: 'avi' },
    audio: { aif: 'aiff', oga: 'ogg' },
    image: { tif: 'tiff' },
  } satisfies Record<MediaType, Record<string, string>>;
  for (const media of ['video', 'audio', 'image'] as const) {
    for (const [format, original] of Object.entries(aliases[media])) {
      const source = fixtures.get(`${media}/${original}`);
      if (source) {
        const output = path.join(directory, `alias ü.${format}`);
        await copyFile(source.filename, output);
        await remember(media, format, output, 'alias');
      }
    }
  }

  const mxf = path.join(directory, 'input only ü.mxf');
  await native([
    '-f',
    'lavfi',
    '-i',
    'color=c=blue:s=720x576:r=25',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=48000',
    '-t',
    '0.24',
    '-c:v',
    'mpeg2video',
    '-pix_fmt',
    'yuv422p',
    '-c:a',
    'pcm_s16le',
    '-ac',
    '2',
    '-f',
    'mxf',
    mxf,
  ]);
  await remember('video', 'mxf', mxf, 'generated');
  const thirdGeneration = path.join(directory, 'input only ü.3g2');
  await native([
    '-i',
    seeds.video,
    '-c:v',
    'mpeg4',
    '-c:a',
    'aac',
    '-f',
    '3g2',
    thirdGeneration,
  ]);
  await remember('video', '3g2', thirdGeneration, 'generated');

  for (const media of ['video', 'audio', 'image'] as const) {
    for (const format of new Set(inputExtensions[media])) {
      if (fixtures.has(`${media}/${format}`)) {
        continue;
      }

      const external = process.env.HONEYMELON_MEDIA_FIXTURES;
      const filename = external && path.join(external, `${media}.${format}`);
      if (filename && (await stat(filename).catch(() => null))) {
        await remember(media, format, filename, 'external');
      } else {
        gaps.push({
          media,
          format,
          reason:
            'No local encoder/fixture; supply HONEYMELON_MEDIA_FIXTURES/' +
            `${media}.${format} to test this accepted input`,
        });
      }
    }
  }

  return { capabilities, fixtures, gaps };
}
