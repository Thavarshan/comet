import path from 'node:path';
import ffmpeg, { setFfmpegPath, setFfprobePath, ffprobe as ffmpegFfprobe } from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { path as ffprobePath } from 'ffprobe-static';
import { Adapter } from '@/types/adapter';

// Initialize FFmpeg paths
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

export class FfmpegAdapter implements Adapter {
  /**
   * Map of FFmpeg processes by ID.
   */
  protected ffmpegProcesses = new Map<string, ffmpeg.FfmpegCommand>();

  /**
   * Converts the file at the given path to the specified output format.
   */
  convert(
    id: string,
    filePath: string,
    outputFormat: string,
    saveDirectory: string,
    event: Electron.IpcMainInvokeEvent,
  ): Promise<string> {
    const outputFileName = `${path.basename(filePath, path.extname(filePath))}.${outputFormat}`;
    const outputPath = path.join(saveDirectory, outputFileName);

    return new Promise((resolve, reject) => {
      ffmpegFfprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format.duration;
        const ffmpegCommand = ffmpeg(filePath)
          .output(outputPath)
          .on('progress', (progress) => {
            const processedSeconds = this.parseTimemark(progress.timemark);
            const calculatedProgress = duration ? (processedSeconds / duration) * 100 : 0;
            event.sender.send('conversion-progress', { id, progress: calculatedProgress });
          })
          .on('end', () => {
            event.sender.send('conversion-progress', { id, progress: 100 });
            this.ffmpegProcesses.delete(id);
            resolve(outputPath);
          })
          .on('error', (error: Error) => {
            this.ffmpegProcesses.delete(id);
            reject(error);
          })
          .save(outputPath);

        this.ffmpegProcesses.set(id, ffmpegCommand);
      });
    });
  }

  /**
   * Cancels the FFmpeg conversion process with the given ID.
   */
  cancel(id: string): boolean {
    const ffmpegCommand = this.ffmpegProcesses.get(id);
    if (!ffmpegCommand) return false;

    try {
      ffmpegCommand.kill('SIGKILL');
      this.ffmpegProcesses.delete(id);
      return true;
    } catch (error) {
      console.error(`Failed to kill FFmpeg process for ID: ${id}`, error);
      return false;
    }
  }

  /**
   * Parses a FFmpeg timemark string into seconds.
   */
  protected parseTimemark(timemark: string): number {
    const parts = timemark.split(':').reverse();
    let seconds = 0;
    if (parts.length > 0) seconds += parseFloat(parts[0]);
    if (parts.length > 1) seconds += parseInt(parts[1]) * 60;
    if (parts.length > 2) seconds += parseInt(parts[2]) * 3600;
    return seconds;
  }
}
