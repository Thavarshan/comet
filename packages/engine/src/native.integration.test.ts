import { mkdtemp, rm, writeFile, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Jimp } from 'jimp';
import {
  createExecutor,
  detectCapabilities,
  runProcess,
  ConversionEngine,
  convertImage,
} from './index';
import {
  defaultConversion,
  type ConversionSpec,
  type Capabilities,
  type Job,
  type MediaType,
} from '@comet/contracts';

let directory: string;
let audio: string;
let video: string;
let image: string;
let capabilities: Capabilities;
const target = `${process.platform}-${process.arch}`;
const binaryDirectory = path.resolve('../../apps/desktop/.cache/bin', target);
const extension = process.platform === 'win32' ? '.exe' : '';
const paths = {
  ffmpegPath: path.join(binaryDirectory, 'ffmpeg' + extension),
  ffprobePath: path.join(binaryDirectory, 'ffprobe' + extension),
  imageWorkerPath: new URL('../dist/image-worker.js', import.meta.url),
};
const execute = createExecutor(paths);
const signal = () => AbortSignal.timeout(20000);

function job(
  mediaType: MediaType,
  inputPath: string,
  outputFormat: string,
): Job {
  return {
    id: crypto.randomUUID(),
    batchId: crypto.randomUUID(),
    itemId: crypto.randomUUID(),
    name: path.basename(inputPath),
    inputPath,
    sizeBytes: 1,
    mediaType,
    outputFormat,
    outputDirectory: directory,
    state: 'running',
    progress: 0,
  };
}

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'comet-native-'));
  audio = path.join(directory, 'audio ü space.wav');
  video = path.join(directory, 'video ü space.mp4');
  image = path.join(directory, 'image ü space.png');
  await runProcess(
    paths.ffmpegPath,
    [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:sample_rate=44100',
      '-t',
      '0.6',
      '-ac',
      '2',
      audio,
    ],
    signal(),
  );
  await runProcess(
    paths.ffmpegPath,
    [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=blue:s=176x144:r=25',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:sample_rate=44100',
      '-t',
      '0.6',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-ac',
      '2',
      '-c:a',
      'aac',
      video,
    ],
    signal(),
  );
  await new Jimp({ width: 8, height: 8, color: 0x3563e9ff }).write(
    image as `${string}.${string}`,
  );
  capabilities = await detectCapabilities(paths.ffmpegPath);
}, 30000);
afterAll(async () => {
  if (directory) {
    await rm(directory, { recursive: true, force: true });
  }
});
describe('bundled native tools', () => {
  it('executes both native binaries and discovers default output encoders', async () => {
    await runProcess(paths.ffprobePath, ['-version'], signal());
    for (const [media, format] of [
      ['video', 'mp4'],
      ['audio', 'mp3'],
      ['image', 'jpg'],
    ] as const) {
      expect(
        capabilities[media].find((item) => item.format === format)?.available,
      ).toBe(true);
    }
  });
  it('creates playable outputs for every advertised available audio/video format', async () => {
    const failures: string[] = [];
    for (const media of ['audio', 'video'] as const) {
      for (const capability of capabilities[media]) {
        if (!capability.available) {
          continue;
        }

        try {
          const output = await execute(
            job(media, media === 'audio' ? audio : video, capability.format),
            signal(),
            () => {},
          );
          const metadata = await runProcess(
            paths.ffprobePath,
            ['-v', 'error', '-show_streams', '-of', 'json', output],
            signal(),
          );
          const streams = (
            JSON.parse(metadata.stdout) as { streams: { codec_type: string }[] }
          ).streams;
          expect(streams.some((stream) => stream.codec_type === media)).toBe(
            true,
          );
        } catch (error) {
          failures.push(`${media}/${capability.format}: ${String(error)}`);
        }
      }
    }

    expect(failures).toEqual([]);
  }, 120000);
  it('creates detectable E-AC-3 from a short narrowband speech source', async () => {
    const source = path.join(directory, 'narrowband.wav');
    await runProcess(
      paths.ffmpegPath,
      [
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=8000',
        '-t',
        '0.24',
        '-ac',
        '1',
        source,
      ],
      signal(),
    );
    const output = await execute(
      job('audio', source, 'eac3'),
      signal(),
      () => {},
    );
    const metadata = await runProcess(
      paths.ffprobePath,
      ['-v', 'error', '-show_streams', '-of', 'json', output],
      signal(),
    );
    const data = JSON.parse(metadata.stdout) as {
      streams: { codec_name: string; sample_rate: string }[];
    };
    expect(data.streams[0]).toMatchObject({
      codec_name: 'eac3',
      sample_rate: '48000',
    });
    await runProcess(
      paths.ffmpegPath,
      ['-v', 'error', '-xerror', '-i', output, '-f', 'null', '-'],
      signal(),
    );
  });
  it('converts every advertised image format in a worker and preserves original bytes', async () => {
    const original = await readFile(image);
    for (const capability of capabilities.image.filter(
      (item) => item.available,
    )) {
      const output = await execute(
        job('image', image, capability.format),
        signal(),
        () => {},
      );
      if (['webp', 'avif'].includes(capability.format)) {
        const probe = await runProcess(
          paths.ffprobePath,
          ['-v', 'error', '-show_streams', '-of', 'json', output],
          signal(),
        );
        expect(JSON.parse(probe.stdout).streams[0].width).toBe(8);
      } else {
        expect((await Jimp.read(output)).bitmap.width).toBe(8);
      }
    }

    expect(await readFile(image)).toEqual(original);
  });
  it('does not overwrite a source or colliding output and removes partial files on failure', async () => {
    const original = await readFile(audio);
    const first = await execute(job('audio', audio, 'wav'), signal(), () => {});
    const second = await execute(
      job('audio', audio, 'wav'),
      signal(),
      () => {},
    );
    expect(first).not.toBe(audio);
    expect(first).not.toBe(second);
    expect(await readFile(audio)).toEqual(original);
    const invalid = path.join(directory, 'broken.mp4');
    await writeFile(invalid, 'not media');
    await expect(
      execute(job('video', invalid, 'mp4'), signal(), () => {}),
    ).rejects.toThrow();
    expect(
      (await readdir(directory)).filter((name) => name.startsWith('.comet-')),
    ).toEqual([]);
  });
  it('cancels native probing/encoding and leaves no published or partial output', async () => {
    const destination = await mkdtemp(path.join(tmpdir(), 'comet-cancel-'));
    try {
      const engine = new ConversionEngine(capabilities, paths);
      const snapshot = await engine.enqueueBatch({
        mediaType: 'video',
        items: [
          {
            itemId: crypto.randomUUID(),
            inputPath: video,
            name: 'video.mp4',
            sizeBytes: 1,
          },
        ],
        outputFormat: 'mp4',
        outputDirectory: destination,
      });
      await engine.cancelBatch(snapshot.batches[0]!.id);
      expect(engine.getSnapshot().jobs[0]!.state).toBe('canceled');
      expect(await readdir(destination)).toEqual([]);
      await engine.shutdown();
    } finally {
      await rm(destination, { recursive: true, force: true });
    }
  });
  it('terminates an image worker before acknowledging cancellation', async () => {
    const controller = new AbortController();
    const output = path.join(directory, '.image-cancel.jpg');
    const operation = convertImage(
      paths.imageWorkerPath,
      image,
      output,
      controller.signal,
    );
    controller.abort();
    await expect(operation).rejects.toMatchObject({ name: 'AbortError' });
    expect((await readdir(directory)).includes('.image-cancel.jpg')).toBe(
      false,
    );
  });
  it('rejects missing inputs and invalid destination directories', async () => {
    await expect(
      execute(
        job('audio', path.join(directory, 'missing.wav'), 'mp3'),
        signal(),
        () => {},
      ),
    ).rejects.toThrow();
    await expect(
      execute(
        { ...job('audio', audio, 'mp3'), outputDirectory: audio },
        signal(),
        () => {},
      ),
    ).rejects.toThrow();
  });
  it('runs richer codecs, audio extraction, frame saving and resize options', async () => {
    const cases: {
      media: MediaType;
      input: string;
      format: string;
      spec: ConversionSpec;
      expected: string;
    }[] = [
      {
        media: 'video',
        input: video,
        format: 'mp4',
        spec: {
          ...defaultConversion('video'),
          kind: 'video',
          codec: 'hevc',
          quality: 'balanced',
          speed: 'fast',
          includeAudio: false,
          height: 64,
        },
        expected: 'hevc',
      },
      {
        media: 'audio',
        input: audio,
        format: 'm4a',
        spec: { kind: 'audio', codec: 'alac', track: 0 },
        expected: 'alac',
      },
      {
        media: 'video',
        input: video,
        format: 'mp3',
        spec: {
          kind: 'audio',
          codec: 'default',
          track: 0,
          bitrate: 128,
          sampleRate: 48000,
          channels: 1,
        },
        expected: 'mp3',
      },
      {
        media: 'video',
        input: video,
        format: 'png',
        spec: {
          kind: 'image',
          quality: 85,
          lossless: false,
          timestamp: 0.2,
          allowFlatten: false,
          background: '#ffffff',
          width: 64,
        },
        expected: 'png',
      },
      {
        media: 'video',
        input: video,
        format: 'mov',
        spec: {
          kind: 'video',
          codec: 'prores',
          quality: 'high',
          speed: 'medium',
          includeAudio: true,
        },
        expected: 'prores',
      },
    ];
    for (const entry of cases) {
      const output = await execute(
        { ...job(entry.media, entry.input, entry.format), spec: entry.spec },
        signal(),
        () => {},
      );
      const probe = await runProcess(
        paths.ffprobePath,
        ['-v', 'error', '-show_streams', '-of', 'json', output],
        signal(),
      );
      const streams = JSON.parse(probe.stdout).streams;
      expect(streams[0].codec_name).toBe(entry.expected);
      if (entry.spec.kind === 'image') {
        expect(streams[0].width).toBe(64);
      }

      if (entry.spec.kind === 'audio' && entry.spec.channels) {
        expect(streams[0].channels).toBe(1);
        expect(streams[0].sample_rate).toBe('48000');
        expect(streams).toHaveLength(1);
      }

      if (entry.spec.kind === 'video' && !entry.spec.includeAudio) {
        expect(streams).toHaveLength(1);
        expect(streams[0].height).toBeLessThanOrEqual(64);
      }
    }
  }, 60000);

  it('requires consent for transparency loss and preserves it in WebP', async () => {
    const transparent = path.join(directory, 'transparent.png');
    await new Jimp({ width: 8, height: 8, color: 0x33669944 }).write(
      transparent as `${string}.${string}`,
    );
    await expect(
      execute(
        {
          ...job('image', transparent, 'jpg'),
          spec: defaultConversion('image'),
        },
        signal(),
        () => {},
      ),
    ).rejects.toThrow('transparency');
    const imageSpec = defaultConversion('image');
    const output = await execute(
      { ...job('image', transparent, 'webp'), spec: imageSpec },
      signal(),
      () => {},
    );
    const decoded = path.join(directory, 'webp-alpha.png');
    await runProcess(
      paths.ffmpegPath,
      ['-v', 'error', '-i', output, decoded],
      signal(),
    );
    expect((await Jimp.read(decoded)).bitmap.data[3]).toBeLessThan(255);
    expect(
      (await readdir(directory)).filter((name) => name.startsWith('.comet-')),
    ).toEqual([]);
  });
});
