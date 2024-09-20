/**
 * @jest-environment node
 */

import { FfmpegAdapter } from '../../src/lib/conversion/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import path from 'node:path';
import { VideoFormat } from '@/enum/video-format';

jest.mock('fluent-ffmpeg');
jest.mock('node:path');

describe('FfmpegAdapter', () => {
  let ffmpegAdapter: FfmpegAdapter;

  beforeEach(() => {
    ffmpegAdapter = new FfmpegAdapter();
    jest.resetAllMocks();
  });

  describe('parseTimemark', () => {
    test('should parse timemark correctly', () => {
      expect(ffmpegAdapter['parseTimemark']('00:00:10')).toBe(10);
      expect(ffmpegAdapter['parseTimemark']('00:01:10')).toBe(70);
      expect(ffmpegAdapter['parseTimemark']('01:01:10')).toBe(3670);
      expect(ffmpegAdapter['parseTimemark']('10')).toBe(10);
    });
  });

  describe('convert', () => {
    const mockedFfmpeg = jest.mocked(ffmpeg) as any;
    const mockedPath = jest.mocked(path) as any;
    const mockEvent = {
      sender: {
        send: jest.fn()
      }
    } as unknown as Electron.IpcMainInvokeEvent;

    test('should handle video conversion process', async () => {
      const mockFfmpegCommand = {
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation(function (this: any, event: string, callback: Function) {
          if (event === 'end') {
            setTimeout(() => callback(), 0);
          } else if (event === 'progress') {
            setTimeout(() => callback({ timemark: '00:00:50' }), 0); // Mock progress update
          }
          return this;
        }),
        save: jest.fn().mockReturnThis()
      };

      mockedFfmpeg.ffprobe = jest.fn((_filePath, callback) => {
        callback(null, { format: { duration: 100 } });
      });

      mockedFfmpeg.mockReturnValue(mockFfmpegCommand as unknown as ffmpeg.FfmpegCommand);
      mockedPath.basename.mockReturnValue('video');
      mockedPath.extname.mockReturnValue('.mp4');
      mockedPath.join.mockImplementation((...args: any) => args.join('/'));

      const outputPath = await ffmpegAdapter.convert(
        '1',
        '/mock/path/video.mp4',
        VideoFormat.MP4,
        '/mock/save',
        mockEvent
      );

      expect(outputPath).toBe('/mock/save/video.mp4');
      expect(mockedFfmpeg.ffprobe).toHaveBeenCalledWith('/mock/path/video.mp4', expect.any(Function));
      expect(mockFfmpegCommand.output).toHaveBeenCalledWith('/mock/save/video.mp4');
      expect(mockFfmpegCommand.save).toHaveBeenCalledWith('/mock/save/video.mp4');
      expect(mockEvent.sender.send).toHaveBeenCalledWith('conversion-progress', { id: '1', progress: 50 });
    });

    test('should handle ffprobe error', async () => {
      mockedFfmpeg.ffprobe = jest.fn((_filePath, callback) => {
        callback(new Error('ffprobe error'), null);
      });

      await expect(ffmpegAdapter.convert(
        '1',
        '/mock/path/video.mp4',
        VideoFormat.MP4,
        '/mock/save',
        mockEvent
      )).rejects.toThrow('ffprobe error');

      expect(mockedFfmpeg.ffprobe).toHaveBeenCalledWith('/mock/path/video.mp4', expect.any(Function));
    });
  });

  describe('cancel', () => {
    test('should cancel the conversion process', () => {
      const mockFfmpegCommand = {
        kill: jest.fn()
      };

      ffmpegAdapter['ffmpegProcesses'].set('1', mockFfmpegCommand as unknown as ffmpeg.FfmpegCommand);

      const result = ffmpegAdapter.cancel('1');

      expect(result).toBe(true);
      expect(mockFfmpegCommand.kill).toHaveBeenCalledWith('SIGKILL');
    });

    test('should return false if no conversion process is found', () => {
      const result = ffmpegAdapter.cancel('1');

      expect(result).toBe(false);
    });
  });
});
