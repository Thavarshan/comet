import ffmpeg, { setFfmpegPath, setFfprobePath, ffprobe as ffmpegFfprobe } from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { path as ffprobePath } from 'ffprobe-static';
import path from 'node:path';

const ffmpegProcesses = new Map<string, ffmpeg.FfmpegCommand>();

/**
 * Set the ffmpeg process for the given ID.
 *
 * @param {string} id
 * @param {ffmpeg.FfmpegCommand} ffmpegCommand
 */
export function setFfmpegProcess(id: string, ffmpegCommand: ffmpeg.FfmpegCommand): void {
  ffmpegProcesses.set(id, ffmpegCommand);
}

let ffmpegPath: string;

try {
  if (!ffmpegStatic) throw new Error('ffmpegStatic not found');
  ffmpegPath = ffmpegStatic.replace('app.asar', 'app.asar.unpacked');
  const ffprobeResolvedPath = ffprobePath.replace('app.asar', 'app.asar.unpacked');

  setFfmpegPath(ffmpegPath);
  setFfprobePath(ffprobeResolvedPath);
} catch (error) {
  console.error('Failed to find ffmpegStatic:', error.message);
}

/**
 * Parse a timemark string into seconds.
 */
export function parseTimemark(timemark: string): number {
  const parts = timemark.split(':').reverse();
  let seconds = 0;
  if (parts.length > 0) seconds += parseFloat(parts[0]);
  if (parts.length > 1) seconds += parseInt(parts[1]) * 60;
  if (parts.length > 2) seconds += parseInt(parts[2]) * 3600;
  return seconds;
}

/**
 * Handle the video conversion process.
 */
export function handleConversion(
  event: Electron.IpcMainInvokeEvent,
  id: string,
  filePath: string,
  outputFormat: string,
  saveDirectory: string,
  resolve: (value: string) => void,
  reject: (reason: unknown) => void,
): void {
  const outputFileName = `${path.basename(filePath, path.extname(filePath))}.${outputFormat}`;
  const outputPath = path.join(saveDirectory, outputFileName);

  ffmpegFfprobe(filePath, (err, metadata) => {
    if (err) {
      reject(err);
      return;
    }

    const duration = metadata.format.duration;

    const ffmpegCommand = ffmpeg(filePath)
      .output(outputPath)
      .on('progress', (progress) => {
        const processedSeconds = parseTimemark(progress.timemark);
        const calculatedProgress = duration ? (processedSeconds / duration) * 100 : 0;
        event.sender.send('conversion-progress', { id, progress: calculatedProgress });
      })
      .on('end', () => {
        event.sender.send('conversion-progress', { id, progress: 100 });
        ffmpegProcesses.delete(id);
        resolve(outputPath);
      })
      .on('error', (error: Error) => {
        ffmpegProcesses.delete(id);
        if (error.message.includes('SIGKILL')) {
          reject(new Error('Conversion canceled by user'));
        } else {
          reject(error);
        }
      })
      .save(outputPath);

    setFfmpegProcess(id, ffmpegCommand);
  });
}

/**
 * Cancel a single FFmpeg process.
 */
export function handleItemConversionCancellation(_event: Electron.IpcMainInvokeEvent, id: string): boolean {
  const ffmpegCommand = ffmpegProcesses.get(id);

  if (!ffmpegCommand) {
    console.warn(`No FFmpeg process found for ID: ${id}`);
    return false;
  }

  try {
    // Send SIGKILL to forcefully stop the process
    ffmpegCommand.kill('SIGKILL');
    ffmpegProcesses.delete(id);
    return true;
  } catch (error) {
    console.error(`Failed to kill FFmpeg process for ID: ${id}`, error);
    return false;
  }
}

/**
 * Cancel all FFmpeg processes.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function handleConversionCancellation(_event: Electron.IpcMainInvokeEvent): boolean {
  for (const [id, ffmpegCommand] of ffmpegProcesses.entries()) {
    try {
      ffmpegCommand.kill('SIGKILL');
      ffmpegProcesses.delete(id);
    } catch (error) {
      console.error(`Failed to kill FFmpeg process for ID: ${id}`, error);
      return false;
    }
  }
  return true;
}
