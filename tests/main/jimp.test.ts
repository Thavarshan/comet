/**
 * @jest-environment node
 */

import { JimpAdapter, JimpType } from '../../src/lib/conversion/jimp';
import { Jimp } from 'jimp';
import path from 'node:path';
import fs from 'fs/promises';

jest.mock('jimp');
jest.mock('node:path');

describe('JimpAdapter', () => {
  let jimpAdapter: JimpAdapter;
  const mockedJimp = jest.mocked(Jimp) as unknown as jest.Mocked<JimpType>;
  const mockedPath = jest.mocked(path) as any;
  const mockEvent = {
    sender: {
      send: jest.fn(),
    },
  } as unknown as Electron.IpcMainInvokeEvent;

  beforeEach(() => {
    jimpAdapter = new JimpAdapter();
    jest.resetAllMocks();
    jest.spyOn(fs, 'mkdir').mockImplementation(async (dir, _options) => {
      if (dir === '/mock/save') {
        return Promise.resolve(undefined);
      }
      return Promise.reject(new Error(`ENOENT: no such file or directory, mkdir '${dir}'`));
    });
  });

  describe('convert', () => {
    test('should handle image conversion process', async () => {
      const mockImage = {
        write: jest.fn().mockResolvedValue(null),
      };

      mockedJimp.read.mockResolvedValue(mockImage as any);
      mockedPath.basename.mockReturnValue('image');
      mockedPath.extname.mockReturnValue('.png');
      mockedPath.join.mockImplementation((...args: any) => args.join('/'));

      const outputPath = await jimpAdapter.convert(
        '1',
        '/mock/path/image.png',
        'jpg',
        '/mock/save',
        mockEvent
      );

      expect(outputPath).toBe('/mock/save/image.jpg');
      expect(fs.mkdir).toHaveBeenCalledWith('/mock/save', { recursive: true });
      expect(mockedJimp.read).toHaveBeenCalledWith('/mock/path/image.png');
      expect(mockImage.write).toHaveBeenCalledWith('/mock/save/image.jpg');
      expect(mockEvent.sender.send).toHaveBeenCalledWith('conversion-progress', { id: '1', progress: 100 });
    });

    test('should handle Jimp read error', async () => {
      mockedJimp.read.mockRejectedValue(new Error('Jimp read error'));

      await expect(
        jimpAdapter.convert(
          '1',
          '/mock/path/image.png',
          'jpg',
          '/mock/save',
          mockEvent
        )
      ).rejects.toThrow('Jimp read error');

      expect(fs.mkdir).toHaveBeenCalledWith('/mock/save', { recursive: true });
      expect(mockedJimp.read).toHaveBeenCalledWith('/mock/path/image.png');
      expect(mockEvent.sender.send).not.toHaveBeenCalled(); // No progress should be sent if there's an error
    });

    test('should ensure save directory is created', async () => {
      const mockImage = {
        write: jest.fn().mockResolvedValue(null),
      };

      mockedJimp.read.mockResolvedValue(mockImage as any);
      mockedPath.basename.mockReturnValue('image');
      mockedPath.extname.mockReturnValue('.png');
      mockedPath.join.mockImplementation((...args: any) => args.join('/'));

      const outputPath = await jimpAdapter.convert('1', '/mock/path/image.png', 'jpg', '/mock/save', mockEvent);

      expect(outputPath).toBe('/mock/save/image.jpg');
      expect(fs.mkdir).toHaveBeenCalledWith('/mock/save', { recursive: true });
      expect(mockedJimp.read).toHaveBeenCalledWith('/mock/path/image.png');
    });
  });

  describe('cancel', () => {
    test('should cancel the conversion process', () => {
      const mockImage = {
        write: jest.fn(),
      };

      jimpAdapter['jimpProcesses'].set('1', mockImage as unknown as typeof Jimp);

      const result = jimpAdapter.cancel('1');

      expect(result).toBe(true);
      expect(jimpAdapter['jimpProcesses'].has('1')).toBe(false); // Ensure the process is removed
    });

    test('should return false if no conversion process is found', () => {
      const result = jimpAdapter.cancel('1');

      expect(result).toBe(false);
    });
  });
});
