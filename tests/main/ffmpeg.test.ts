import {
  parseTimemark,
  handleConversion,
  handleConversionCancellation,
  setFfmpegProcess
} from '../../src/lib/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import path from 'node:path';

jest.mock('fluent-ffmpeg');
jest.mock('node:path');

describe('ffmpeg utilities', () => {
  describe('parseTimemark', () => {
    test('should parse timemark correctly', () => {
      expect(parseTimemark('00:00:10')).toBe(10);
      expect(parseTimemark('00:01:10')).toBe(70);
      expect(parseTimemark('01:01:10')).toBe(3670);
      expect(parseTimemark('10')).toBe(10);
    });
  });

  describe('handleConversion', () => {
    const mockedFfmpeg = jest.mocked(ffmpeg) as any;
    const mockedPath = jest.mocked(path) as any;
    const mockEvent = {
      sender: {
        send: jest.fn()
      }
    } as unknown as Electron.IpcMainInvokeEvent;

    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('should handle video conversion process', (done) => {
      const mockFfmpegCommand = {
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation(function (this: any, event: string, callback: Function) {
          if (event === 'end') {
            setTimeout(() => callback(), 0);
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

      handleConversion(
        mockEvent,
        '1',
        '/mock/path/video.mp4',
        'mp4',
        '/mock/save',
        (outputPath) => {
          expect(outputPath).toBe('/mock/save/video.mp4');
          done();
        },
        (error) => {
          done(error);
        }
      );

      expect(mockedFfmpeg.ffprobe).toHaveBeenCalledWith('/mock/path/video.mp4', expect.any(Function));
      expect(mockFfmpegCommand.output).toHaveBeenCalledWith('/mock/save/video.mp4');
      expect(mockFfmpegCommand.save).toHaveBeenCalledWith('/mock/save/video.mp4');
    });

    test('should handle ffprobe error', (done) => {
      mockedFfmpeg.ffprobe = jest.fn((_filePath, callback) => {
        callback(new Error('ffprobe error'), null);
      });

      handleConversion(
        mockEvent,
        '1',
        '/mock/path/video.mp4',
        'mp4',
        '/mock/save',
        () => {
          done(new Error('Expected to fail'));
        },
        (error) => {
          expect(error).toEqual(new Error('ffprobe error'));
          done();
        }
      );

      expect(mockedFfmpeg.ffprobe).toHaveBeenCalledWith('/mock/path/video.mp4', expect.any(Function));
    });
  });

  describe('handleConversionCancellation', () => {
    const mockEvent = {} as unknown as Electron.IpcMainInvokeEvent;

    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('should cancel the conversion process', () => {
      const mockFfmpegCommand = {
        kill: jest.fn()
      };

      setFfmpegProcess('1', mockFfmpegCommand as unknown as ffmpeg.FfmpegCommand);

      const result = handleConversionCancellation(mockEvent, '1');

      expect(result).toBe(true);
      expect(mockFfmpegCommand.kill).toHaveBeenCalledWith('SIGKILL');
    });

    test('should return false if no conversion process is found', () => {
      const result = handleConversionCancellation(mockEvent, '1');

      expect(result).toBe(false);
    });
  });
});
