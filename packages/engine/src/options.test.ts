import { expect, it } from 'vitest';
import { defaultConversion } from '@honeymelon/contracts';
import { encodingArguments, resolveEncoding } from './options';

it('resamples AMR output to its required mono narrowband speech profile', () => {
  const spec = defaultConversion('audio');
  const args = encodingArguments('amr', spec, resolveEncoding('amr', spec));
  expect(args).toContain('libopencore_amrnb');
  expect(args.slice(-6)).toEqual(['-ar', '8000', '-ac', '1', '-b:a', '12200']);
});

it('rejects incompatible explicit AMR settings before native execution', () => {
  const spec = { ...defaultConversion('audio'), kind: 'audio' as const };
  expect(() => resolveEncoding('amr', { ...spec, sampleRate: 48000 })).toThrow(
    'AMR requires 8000 Hz mono audio',
  );
  expect(() => resolveEncoding('amr', { ...spec, channels: 2 })).toThrow(
    'AMR requires 8000 Hz mono audio',
  );
});
