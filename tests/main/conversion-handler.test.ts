/**
 * @jest-environment node
 */

import { ConversionHandler } from '../../src/lib/conversion/conversion-handler';
import { FfmpegAdapter } from '../../src/lib/conversion/ffmpeg';
import { JimpAdapter } from '../../src/lib/conversion/jimp';
import { Media } from '@/types/media';
import { Media as MediaType } from '@/enum/media';
import { VideoFormat } from '@/enum/video-format';
import { AudioFormat } from '@/enum/audio-format';
import { ImageFormat } from '@/enum/image-format';

jest.mock('../../src/lib/conversion/ffmpeg');
jest.mock('../../src/lib/conversion/jimp');

describe('ConversionHandler', () => {
  let conversionHandler: ConversionHandler;
  let mockEvent: Electron.IpcMainInvokeEvent;

  beforeEach(() => {
    conversionHandler = new ConversionHandler();
    mockEvent = {
      sender: {
        send: jest.fn(),
      },
    } as unknown as Electron.IpcMainInvokeEvent;
    jest.resetAllMocks();
  });

  describe('handle', () => {
    test('should handle image conversion with JimpAdapter', async () => {
      const mockJimpAdapter = jest.spyOn(JimpAdapter.prototype, 'convert').mockResolvedValue('/mock/path/image.jpg');

      const result = await conversionHandler.handle(
        '1',
        '/mock/path/image.jpg',
        ImageFormat.JPG,
        '/mock/save',
        MediaType.IMAGE,
        mockEvent,
      );

      expect(result).toBe('/mock/path/image.jpg');
      expect(mockJimpAdapter).toHaveBeenCalledWith(
        '1',
        '/mock/path/image.jpg',
        ImageFormat.JPG,
        '/mock/save',
        mockEvent,
      );
    });

    test('should handle video conversion with FfmpegAdapter', async () => {
      const mockFfmpegAdapter = jest
        .spyOn(FfmpegAdapter.prototype, 'convert')
        .mockResolvedValue('/mock/path/video.mp4');

      const result = await conversionHandler.handle(
        '1',
        '/mock/path/video.mp4',
        VideoFormat.MP4,
        '/mock/save',
        MediaType.VIDEO,
        mockEvent,
      );

      expect(result).toBe('/mock/path/video.mp4');
      expect(mockFfmpegAdapter).toHaveBeenCalledWith(
        '1',
        '/mock/path/video.mp4',
        VideoFormat.MP4,
        '/mock/save',
        mockEvent,
      );
    });

    test('should handle audio conversion with FfmpegAdapter', async () => {
      const mockFfmpegAdapter = jest
        .spyOn(FfmpegAdapter.prototype, 'convert')
        .mockResolvedValue('/mock/path/audio.mp3');

      const result = await conversionHandler.handle(
        '1',
        '/mock/path/audio.mp3',
        AudioFormat.MP3,
        '/mock/save',
        MediaType.AUDIO,
        mockEvent,
      );

      expect(result).toBe('/mock/path/audio.mp3');
      expect(mockFfmpegAdapter).toHaveBeenCalledWith(
        '1',
        '/mock/path/audio.mp3',
        AudioFormat.MP3,
        '/mock/save',
        mockEvent,
      );
    });

    test('should reject unsupported media type', async () => {
      try {
        await conversionHandler.handle(
          '1',
          '/mock/path/unknown.file',
          'unknown_format' as VideoFormat,
          '/mock/save',
          'unknown' as Media,
          mockEvent,
        );
      } catch (error) {
        expect(error).toEqual(new Error('Unsupported type: unknown'));
      }
    });

    test('should handle conversion failure', async () => {
      const mockFfmpegAdapter = jest
        .spyOn(FfmpegAdapter.prototype, 'convert')
        .mockRejectedValue(new Error('Conversion failed'));

      await expect(
        conversionHandler.handle(
          '1',
          '/mock/path/video.mp4',
          VideoFormat.MP4,
          '/mock/save',
          MediaType.VIDEO,
          mockEvent,
        ),
      ).rejects.toThrow('Conversion failed');

      expect(mockFfmpegAdapter).toHaveBeenCalledWith(
        '1',
        '/mock/path/video.mp4',
        VideoFormat.MP4,
        '/mock/save',
        mockEvent,
      );
    });
  });

  describe('cancel', () => {
    test('should cancel image conversion', () => {
      const mockJimpAdapter = jest.spyOn(JimpAdapter.prototype, 'cancel').mockReturnValue(true);

      // Mock the process is already stored in the map
      const jimpAdapterInstance = new JimpAdapter();
      conversionHandler['conversions'].set('1', jimpAdapterInstance);

      const result = conversionHandler.cancel('1');

      expect(result).toBe(true);
      expect(mockJimpAdapter).toHaveBeenCalledWith('1');
      expect(conversionHandler['conversions'].has('1')).toBe(false);
    });

    test('should return false if no conversion process found', () => {
      const result = conversionHandler.cancel('1');

      expect(result).toBe(false);
    });
  });

  describe('cancelAll', () => {
    test('should cancel all conversions', () => {
      const mockFfmpegAdapter = jest.spyOn(FfmpegAdapter.prototype, 'cancel').mockReturnValue(true);
      const mockJimpAdapter = jest.spyOn(JimpAdapter.prototype, 'cancel').mockReturnValue(true);

      // Mock multiple processes in the map
      conversionHandler['conversions'].set('1', new FfmpegAdapter());
      conversionHandler['conversions'].set('2', new JimpAdapter());

      conversionHandler.cancelAll();

      expect(mockFfmpegAdapter).toHaveBeenCalledWith('1');
      expect(mockJimpAdapter).toHaveBeenCalledWith('2');
      expect(conversionHandler['conversions'].size).toBe(0);
    });
  });
});
