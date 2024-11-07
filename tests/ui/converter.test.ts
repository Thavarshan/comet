import { createPinia, setActivePinia } from 'pinia';
import { createConverterStore } from '@/ui/stores/converter';
import { useToast } from '@/ui/components/toast/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { INITIAL_PROGRESS } from '@/consts/ffprobe';
import { Item } from '@/types/item';
import { filesize } from 'filesize';
import { VideoFormat } from '@/enum/video-format';
import { Media } from '@/enum/media';

jest.mock('@/ui/components/toast/use-toast');
jest.mock('uuid');
jest.mock('filesize', () => ({
  filesize: jest.fn((size) => `${size} bytes`),
}));

describe('Converter Store', () => {
  let store: ReturnType<ReturnType<typeof createConverterStore>>;
  const mockToast = jest.fn();
  const mockElectron = {
    arch: process.arch,
    platform: process.platform as NodeJS.Platform,
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    setupGetSystemTheme: jest.fn().mockReturnValue('light'),
    getDesktopPath: jest.fn().mockResolvedValue('/mock/desktop/path'),
    getFilePath: jest.fn().mockReturnValue('/mock/file/path'),
    convertMedia: jest.fn().mockResolvedValue('/mock/output/path'),
    cancelItemConversion: jest.fn().mockResolvedValue(true),
    cancelConversion: jest.fn().mockResolvedValue(true),
    selectDirectory: jest.fn().mockResolvedValue('/mock/save'),
    send: jest.fn(),
    getSystemTheme: jest.fn().mockReturnValue('light'),
  };

  beforeAll(() => {
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (uuidv4 as jest.Mock).mockReturnValue('mock-uuid');
    window.electron = mockElectron;
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    store = createConverterStore()();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize store with default values', () => {
    expect(store.items).toEqual([]);
    expect(store.saveDirectory).toBeUndefined();
    expect(store.convertTo).toBe(undefined);
    expect(store.conversionInProgress).toBe(false);
  });

  test('should handle file uploads', () => {
    const mockFileList = {
      0: new File(['content'], 'file1.mp4', { size: 1024 } as any),
      1: new File(['content'], 'file2.mp4', { size: 2048 } as any),
      length: 2,
      item: (index: number) => mockFileList[index],
    } as unknown as FileList;

    store.handleUpload(mockFileList);

    expect(store.items.length).toBe(2);
    expect(store.items[0].name).toBe('file1.mp4');
    expect(store.items[0].size).toBe('7 bytes');
    expect(store.items[1].name).toBe('file2.mp4');
    expect(store.items[1].size).toBe('7 bytes');
    expect(filesize).toHaveBeenCalledWith(7);
    expect(filesize).toHaveBeenCalledWith(7);
  });

  test('should update save directory', () => {
    store.handleSaveDirectoryUpdate('/new/save/directory');
    expect(store.saveDirectory).toBe('/new/save/directory');
  });

  test('should set conversion format', () => {
    store.setFormat(VideoFormat.AVI);
    expect(store.convertTo).toBe(VideoFormat.AVI);
  });

  test('should remove item from the list', () => {
    store.items.push({ id: '1', name: 'file1.mp4', converting: false } as Item);
    store.removeItem(0);
    expect(store.items.length).toBe(0);
  });

  test('should clear all items from the list', () => {
    store.items.push({ id: '1', name: 'file1.mp4', converting: false } as Item);
    store.clearItems();
    expect(store.items.length).toBe(0);
  });

  test('should perform conversion', async () => {
    store.items.push({ id: '1', name: 'file1.mp4', path: '/mock/file/path', converted: false, converting: false, progress: 0 } as Item);
    store.saveDirectory = '/mock/save';
    store.convertTo = VideoFormat.MP4;
    store.mediaType = Media.VIDEO;

    await store.performConversion();

    expect(store.items[0].converted).toBe(true);
    expect(store.items[0].progress).toBe(100);
    expect(store.items[0].converting).toBe(false);
    expect(store.conversionInProgress).toBe(false);
    expect(mockElectron.convertMedia).toHaveBeenCalledWith('1', '/mock/file/path', VideoFormat.MP4, '/mock/save', Media.VIDEO);
  });

  test('should cancel item conversion', async () => {
    store.items.push({ id: '1', name: 'file1.mp4', converting: true } as Item);
    await store.cancelItem(0);
    expect(mockElectron.cancelItemConversion).toHaveBeenCalledWith('1');
  });

  test('should cancel all conversions', async () => {
    store.items.push({ id: '1', name: 'file1.mp4', converting: true, progress: 50 } as Item);
    await store.cancelConversion();
    expect(mockElectron.cancelConversion).toHaveBeenCalled();
    expect(store.items[0].converting).toBe(false);
    expect(store.items[0].progress).toBe(INITIAL_PROGRESS);
  });

  test('should handle conversion progress events', async () => {
    const mockEvent = { id: '1', progress: 50 };
    store.items.push({ id: '1', name: 'file1.mp4', progress: 0 } as Item);

    // Call the init function to set up event listeners
    await store.init();

    // Ensure the event listener is set up
    const progressCall = mockElectron.on.mock.calls.find(call => call[0] === 'conversion-progress');
    expect(progressCall).toBeDefined();

    if (progressCall) {
      const progressHandler = progressCall[1];
      progressHandler(null, mockEvent);

      expect(store.items[0].progress).toBe(0);
    }
  });

  test('should handle conversion canceled events', async () => {
    const mockEvent = { id: '1' };
    store.items.push({ id: '1', name: 'file1.mp4', converting: true, progress: 50 } as Item);

    await store.init();

    const cancelHandler = mockElectron.on.mock.calls.find(call => call[0] === 'conversion-canceled')[1];
    cancelHandler(null, mockEvent);

    expect(store.items[0].converting).toBe(false);
    expect(store.items[0].progress).toBe(INITIAL_PROGRESS);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Conversion canceled',
      description: 'Conversion for file1.mp4 has been canceled.',
    });
  });

  test('should remove event listeners on unmount', () => {
    const unmountHandler = mockElectron.removeAllListeners;
    store.clearListeners();
    store.$dispose();
    expect(unmountHandler).toHaveBeenCalledWith('conversion-progress');
    expect(unmountHandler).toHaveBeenCalledWith('conversion-canceled');
  });
});
