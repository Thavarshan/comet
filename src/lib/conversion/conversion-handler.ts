import { Media } from '@/types/media';
import { Media as MediaType } from '@/enum/media';
import { VideoFormat } from '@/enum/video-format';
import { AudioFormat } from '@/enum/audio-format';
import { ImageFormat } from '@/enum/image-format';
import { FfmpegAdapter } from './ffmpeg';
import { JimpAdapter } from './jimp';
import { Adapter } from '@/types/adapter';

export class ConversionHandler {
  protected conversions: Map<string, Adapter> = new Map();

  /**
   * Adds a new conversion to the handler.
   */
  async handle(
    id: string,
    filePath: string,
    outputFormat: VideoFormat | AudioFormat | ImageFormat,
    saveDirectory: string,
    type: Media,
    event: Electron.IpcMainInvokeEvent,
  ): Promise<string> {
    const adapter = this.getAdapter(type);

    this.conversions.set(id, adapter);

    try {
      const result = await adapter.convert(id, filePath, outputFormat, saveDirectory, event);

      this.conversions.delete(id);

      return result;
    } catch (error) {
      this.conversions.delete(id);

      throw error;
    }
  }

  /**
   * Cancels the conversion with the given ID.
   */
  cancel(id: string): boolean {
    const adapter = this.conversions.get(id);
    if (adapter) {
      const result = adapter.cancel(id);
      this.conversions.delete(id);
      return result;
    }
    return false;
  }

  /**
   * Cancels all conversions.
   */
  cancelAll(): void {
    this.conversions.forEach((adapter, id) => adapter.cancel(id));
    this.conversions.clear();
  }

  /**
   * Returns the appropriate adapter for the given type.
   */
  protected getAdapter(type: Media) {
    switch (type) {
      case MediaType.IMAGE:
        return new JimpAdapter();
      case MediaType.VIDEO:
        return new FfmpegAdapter();
      case MediaType.AUDIO:
        return new FfmpegAdapter();
      default:
        throw new Error(`Unsupported type: ${type}`);
    }
  }
}
