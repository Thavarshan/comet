import { Jimp } from 'jimp';
import { promises as fs } from 'fs'; // Use `fs.promises` for async directory management
import path from 'node:path';
import { ImageFormat } from '@/enum/image-format';

type JimpType = typeof Jimp;

const jimpProcesses = new Map<string, JimpType>();

/**
 * Set the Jimp process for the given ID.
 */
export function setJimpProcess(id: string, jimpProcess: JimpType): void {
  jimpProcesses.set(id, jimpProcess);
}

/**
 * Handle the image conversion process.
 */
export async function handleConversion(
  event: Electron.IpcMainInvokeEvent,
  id: string,
  filePath: string,
  outputFormat: ImageFormat,
  saveDirectory: string,
  resolve: (value: string) => void,
  reject: (reason: unknown) => void,
): Promise<void> {
  try {
    const outputFileName = `${path.basename(filePath, path.extname(filePath))}.${outputFormat}`;
    const outputPath = path.join(saveDirectory, outputFileName);

    // Ensure save directory exists
    await fs.mkdir(saveDirectory, { recursive: true });

    const image = await Jimp.read(filePath);
    setJimpProcess(id, image as unknown as JimpType);

    // Resize, adjust quality, and write image
    await image.write(outputPath as `${string}.${string}`);

    // Send progress update
    event.sender.send('conversion-progress', { id, progress: 100 });
    jimpProcesses.delete(id);
    resolve(outputPath);
  } catch (error) {
    console.error(`Error in Jimp process for file: ${filePath}`, error);
    jimpProcesses.delete(id);
    reject(error);
  }
}

/**
 * Cancel a single Jimp process.
 */
export function handleItemConversionCancellation(_event: Electron.IpcMainInvokeEvent, id: string): boolean {
  const jimpProcess = jimpProcesses.get(id);

  if (!jimpProcess) {
    console.warn(`No Jimp process found for ID: ${id}`);
    return false;
  }

  // Since Jimp does not natively support cancellation, we just remove it from tracking
  try {
    jimpProcesses.delete(id);
    return true;
  } catch (error) {
    console.error(`Failed to cancel Jimp process for ID: ${id}`, error);
    return false;
  }
}

/**
 * Cancel all Jimp processes.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function handleConversionCancellation(_event: Electron.IpcMainInvokeEvent): boolean {
  try {
    for (const id of jimpProcesses.keys()) {
      jimpProcesses.delete(id);
    }
    return true;
  } catch (error) {
    console.error(`Failed to cancel Jimp processes`, error);
    return false;
  }
}
