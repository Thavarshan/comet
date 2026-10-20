import { access, link, rm, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import {
  defaultConversion,
  type MediaMetadata,
  type Job,
} from '@honeymelon/contracts';
import { runProcess } from './process.js';
import { resolveEncoding, encodingArguments } from './options.js';
import { probeFile } from './metadata.js';

/**
 * Host-supplied resources; the engine never discovers Electron paths.
 */
export interface EnginePaths {
  ffmpegPath: string;
  ffprobePath: string;
  imageWorkerPath: string | URL;
}

export type Executor = (
  job: Job,
  signal: AbortSignal,
  progress: (percent: number | null, metadata?: MediaMetadata) => void,
) => Promise<string>;

/**
 * Reject destinations that are relative, missing, or not writable.
 */
export async function assertDirectory(directory: string): Promise<void> {
  if (!path.isAbsolute(directory) || !(await stat(directory)).isDirectory()) {
    throw new Error('Destination must be an existing absolute directory');
  }

  await access(directory, constants.W_OK);
}

/**
 * Build a converter with injected tool paths and atomic output publication.
 * Existing files, including the input, are never replaced.
 */
export function createExecutor(paths: EnginePaths): Executor {
  return async (job, signal, progress) => {
    signal.throwIfAborted();
    if (
      !path.isAbsolute(job.inputPath) ||
      !(await stat(job.inputPath)).isFile()
    ) {
      throw new Error('Input must be a local file');
    }

    await assertDirectory(job.outputDirectory);
    let stem = path.basename(job.inputPath, path.extname(job.inputPath));
    // Leave room for the output extension and collision suffix without
    // splitting Unicode characters.
    while (Buffer.byteLength(stem, 'utf8') > 200) {
      stem = Array.from(stem).slice(0, -1).join('');
    }

    const temporary = path.join(
      job.outputDirectory,
      `.honeymelon-${randomUUID()}.${job.outputFormat}`,
    );
    let published: string | undefined;
    const spec = job.spec ?? defaultConversion(job.mediaType);
    const profile = resolveEncoding(job.outputFormat, spec);
    try {
      const metadata = await probeFile(
        paths.ffprobePath,
        job.inputPath,
        signal,
        /\.(gif|webp|tiff?)$/i.test(job.inputPath),
      );
      progress(null, metadata);
      if (
        spec.kind === 'image' &&
        job.mediaType === 'image' &&
        (metadata.frames ?? 1) > 1 &&
        !spec.allowFlatten
      ) {
        throw new Error('Choose first frame/page to convert animated media');
      }

      if (spec.kind === 'image') {
        const decoded = temporary + '.decoded.png';
        const prepared = temporary + '.prepared.png';
        try {
          if (
            job.mediaType === 'video' &&
            metadata.duration &&
            spec.timestamp >= metadata.duration
          ) {
            throw new Error('Frame timestamp is outside the source duration');
          }

          await runProcess(
            paths.ffmpegPath,
            [
              '-nostdin',
              '-v',
              'error',
              '-protocol_whitelist',
              'file,pipe',
              '-i',
              job.inputPath,
              ...(job.mediaType === 'video'
                ? ['-ss', String(spec.timestamp)]
                : []),
              '-map',
              '0:v:0',
              '-frames:v',
              '1',
              '-c:v',
              'png',
              '-f',
              'image2',
              decoded,
            ],
            signal,
          );
          const modern = ['webp', 'avif'].includes(job.outputFormat);
          await convertImage(
            paths.imageWorkerPath,
            decoded,
            modern ? prepared : temporary,
            signal,
            spec,
            job.outputFormat,
          );
          if (modern) {
            await runProcess(
              paths.ffmpegPath,
              [
                '-nostdin',
                '-v',
                'error',
                '-protocol_whitelist',
                'file,pipe',
                '-i',
                prepared,
                ...encodingArguments(job.outputFormat, spec, profile),
                '-f',
                profile.muxer,
                temporary,
              ],
              signal,
            );
          }
        } finally {
          await Promise.all([
            rm(decoded, { force: true }),
            rm(prepared, { force: true }),
          ]);
        }
      } else {
        signal.throwIfAborted();
        const duration = metadata.duration ?? 0;
        if (spec.kind === 'audio' && !metadata.audio[spec.track]) {
          throw new Error('Selected audio track is unavailable');
        }

        if (spec.kind !== 'audio' && !metadata.videoCodec) {
          throw new Error('Input has no video/image stream');
        }

        const args = [
          '-nostdin',
          '-hide_banner',
          '-v',
          'error',
          '-protocol_whitelist',
          'file,pipe',
          '-i',
          job.inputPath,
        ];
        args.push(...encodingArguments(job.outputFormat, spec, profile));
        args.push(
          '-progress',
          'pipe:1',
          '-nostats',
          '-f',
          profile.muxer,
          temporary,
        );
        let buffer = '';
        await runProcess(paths.ffmpegPath, args, signal, (chunk) => {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('out_time_us=')) {
              const seconds = Number(line.slice(12)) / 1_000_000;
              progress(
                duration > 0 && Number.isFinite(seconds)
                  ? Math.min(99, Math.max(0, (seconds / duration) * 100))
                  : null,
              );
            }
          }
        });
      }

      signal.throwIfAborted();
      // Hard-link publication is atomic and never replaces an existing file,
      // including the source.
      for (let suffix = 0; suffix < 10000; suffix++) {
        const candidate = path.join(
          job.outputDirectory,
          `${stem}${suffix ? ` (${suffix})` : ''}.${job.outputFormat}`,
        );
        try {
          await link(temporary, candidate);
          published = candidate;
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
            throw error;
          }
        }
      }

      if (!published) {
        throw new Error('No free output filename');
      }

      signal.throwIfAborted();
      await rm(temporary, { force: true });
      signal.throwIfAborted();

      return published;
    } catch (error) {
      await rm(temporary, { force: true });
      if (published) {
        await rm(published, { force: true });
      }

      throw error;
    }
  };
}

/**
 * Run image decoding and encoding outside the application event loop.
 * Wait for worker exit, including forced termination, before settling.
 */
export async function convertImage(
  workerPath: string | URL,
  inputPath: string,
  outputPath: string,
  signal: AbortSignal,
  spec = defaultConversion('image'),
  targetFormat = path.extname(outputPath).slice(1),
): Promise<void> {
  signal.throwIfAborted();

  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: { inputPath, outputPath, spec, targetFormat },
    });
    let failure: Error | undefined;
    let succeeded = false;
    const abort = () => {
      void worker.terminate();
    };

    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      abort();
    }

    worker.on('message', (result: { ok: boolean; message?: string }) => {
      succeeded = result.ok;
      if (!result.ok) {
        failure = new Error(result.message ?? 'Image conversion failed');
      }
    });
    worker.on('error', (error) => {
      failure = error;
    });
    worker.once('exit', (code) => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) {
        reject(new DOMException('Conversion canceled', 'AbortError'));
      } else if (failure) {
        reject(failure);
      } else if (code === 0 && succeeded) {
        resolve();
      } else {
        reject(new Error('Image worker exited before completing'));
      }
    });
  });
}
