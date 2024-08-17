import { IpcMainInvokeEvent } from 'electron';
import { FfmpegCommand } from 'fluent-ffmpeg';
import { Channel } from '../enums/channel';
import { Event } from '../enums/event';

/**
 * Handle the video conversion process.
 */
export async function handleConversion(
  ffmpeg: (filePath: string) => FfmpegCommand,
  event: IpcMainInvokeEvent,
  filePath: string,
  outputFilePath: string,
  outputFormat: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .toFormat(outputFormat)
      .on(Event.PRROGRESS, (progress) => {
        if (progress.percent) {
          event.sender.send(
            Channel.CONVERSION_PROGRESS,
            progress
          );
        }
      })
      .on(Event.END, () => resolve(outputFilePath))
      .on(Event.ERROR, (error) => {
        event.sender.send(
          Channel.CONVERSION_ERROR,
          `FFmpeg error: ${error.message}`
        );
        reject(error);
      })
      .save(outputFilePath);
  });
}
