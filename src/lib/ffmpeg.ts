import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import path from 'node:path';

const ffmpegProcesses = new Map<string, ffmpeg.FfmpegCommand>();
const ffmpegPath = ffmpegStatic.replace('app.asar', 'app.asar.unpacked');
const ffprobePath = ffprobe.path.replace('app.asar', 'app.asar.unpacked');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Parse a timemark string into seconds
 *
 * @param {string} timemark
 *
 * @returns {number}
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
 * Handle the video conversion process
 *
 * @param {Electron.IpcMainInvokeEvent} event
 * @param {string} id
 * @param {string} filePath
 * @param {string} outputFormat
 * @param {string} saveDirectory
 * @param {(value: string) => void} resolve
 * @param {(reason: unknown) => void} reject
 *
 * @returns {void}
 */
export function handleConversion(
  event: Electron.IpcMainInvokeEvent,
  id: string,
  filePath: string,
  outputFormat: string,
  saveDirectory: string,
  resolve: (value: string) => void,
  reject: (reason: unknown) => void
): void {
  const outputFileName = path.basename(filePath, path.extname(filePath))
    + '.'
    + outputFormat;
  const outputPath = path.join(saveDirectory, outputFileName);

  ffmpeg.ffprobe(filePath, (err, metadata) => {
    if (err) {
      reject(err);
      return;
    }

    const duration = metadata.format.duration;

    const ffmpegCommand = ffmpeg(filePath)
      .output(outputPath)
      .on('progress', (progress) => {
        const processedSeconds = parseTimemark(progress.timemark);
        const calculatedProgress = (processedSeconds / duration) * 100;

        event.sender.send('conversion-progress', {
          id,
          progress: calculatedProgress
        });
      })
      .on('end', () => {
        ffmpegProcesses.delete(id);
        resolve(outputPath);
      })
      .on('error', (error: Error) => {
        ffmpegProcesses.delete(id);
        if (error.message.includes('SIGKILL')) {
          reject(new Error('Conversion canceled by user'));
          return;
        }
        reject(error);
      })
      .save(outputPath);

    ffmpegProcesses.set(id, ffmpegCommand);
  });
}

/**
 * Handle the video conversion cancellation
 *
 * @param {Electron.IpcMainInvokeEvent} event
 * @param {string} id
 *
 * @returns {boolean}
 */
export function handleConversionCancellation(
  event: Electron.IpcMainInvokeEvent,
  id: string
): boolean {
  const ffmpegCommand = ffmpegProcesses.get(id);

  if (!ffmpegCommand) {
    return false;
  }

  ffmpegCommand.kill('SIGKILL');
  ffmpegProcesses.delete(id);

  return true;
}
