import { expect, it } from 'vitest';
import {
  classifyConversionError,
  ConversionServiceError,
  outputFilename,
} from './service';

it('creates portable names without carrying a source path or extension', () => {
  expect(outputFilename('C:\\private\\a movie.MOV', 'mp4')).toBe('a movie.mp4');
  expect(outputFilename('/private/猫.png', 'webp')).toBe('猫.webp');
  expect(outputFilename('', 'jpg')).toBe('output.jpg');
  expect(() => outputFilename('source', '../mp4')).toThrow('Invalid');
});

it('classifies cancellation and actionable failures without message matching', () => {
  expect(
    classifyConversionError(new DOMException('Stop', 'AbortError')),
  ).toEqual({
    code: 'canceled',
    recoverable: true,
  });
  expect(
    classifyConversionError(new ConversionServiceError('disposed', 'Closed')),
  ).toEqual({ code: 'disposed', recoverable: false });
  expect(classifyConversionError('unknown')).toEqual({
    code: 'conversion-failed',
    recoverable: true,
  });
});
