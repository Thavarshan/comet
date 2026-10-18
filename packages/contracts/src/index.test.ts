import { describe, expect, it } from 'vitest';
import {
  acceptsFile,
  batchSchema,
  defaultPreferences,
  preferencesSchema,
} from './index';

const item = {
  itemId: 'one',
  inputPath: '/tmp/a.mp4',
  name: 'a.mp4',
  sizeBytes: 10,
};
const request = {
  mediaType: 'video',
  items: [item],
  outputFormat: 'mp4',
  outputDirectory: '/tmp',
};
describe('browser-safe contracts', () => {
  it('accepts case-insensitive input extensions separately from output capabilities', () => {
    expect(acceptsFile('image', 'picture.TIF')).toBe(true);
    expect(acceptsFile('video', 'movie.MP4')).toBe(true);
    expect(acceptsFile('audio', 'script.exe')).toBe(false);
  });
  it('rejects unsupported formats, remote paths, invalid metadata, extra fields and duplicate item IDs', () => {
    expect(batchSchema.parse(request).outputFormat).toBe('mp4');
    for (const invalid of [
      { ...request, outputFormat: '../../bad' },
      { ...request, items: [{ ...item, inputPath: 'https://host/a.mp4' }] },
      { ...request, items: [{ ...item, sizeBytes: -1 }] },
      { ...request, injected: true },
      { ...request, items: [item, item] },
    ]) {
      expect(batchSchema.safeParse(invalid).success).toBe(false);
    }
  });
  it('validates versioned preferences and media-specific formats', () => {
    const preferences = defaultPreferences('/tmp');
    expect(preferencesSchema.parse(preferences)).toEqual(preferences);
    expect(
      preferencesSchema.safeParse({ ...preferences, version: 99 }).success,
    ).toBe(false);
    expect(
      preferencesSchema.safeParse({
        ...preferences,
        media: {
          ...preferences.media,
          image: { format: 'mp4', directory: '/tmp' },
        },
      }).success,
    ).toBe(false);
  });
});
