import { Jimp } from 'jimp';
import { promises as fs } from 'fs'; // Use `fs.promises` for async directory management
import path from 'node:path';
import { Adapter } from '@/types/adapter';

export type JimpType = typeof Jimp;

export class JimpAdapter implements Adapter {
  protected jimpProcesses = new Map<string, JimpType>();

  /**
   * Converts the file at the given path to the specified output format.
   */
  async convert(
    id: string,
    filePath: string,
    outputFormat: string,
    saveDirectory: string,
    event: Electron.IpcMainInvokeEvent,
  ): Promise<string> {
    const outputFileName = `${path.basename(filePath, path.extname(filePath))}.${outputFormat}`;
    const outputPath = path.join(saveDirectory, outputFileName);

    await fs.mkdir(saveDirectory, { recursive: true });

    const image = await Jimp.read(filePath);
    this.jimpProcesses.set(id, image as unknown as JimpType);

    await image.write(outputPath as `${string}.${string}`);
    event.sender.send('conversion-progress', { id, progress: 100 });
    this.jimpProcesses.delete(id);

    return outputPath;
  }

  /**
   * Cancels the Jimp conversion process with the given ID.
   */
  cancel(id: string): boolean {
    return this.jimpProcesses.delete(id);
  }
}
