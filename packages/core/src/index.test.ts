import { describe, expect, it } from 'vitest';
import {
  acceptQueueSnapshot,
  applyJobEvent,
  assertOutputAvailable,
  serializeQueue,
  nextQueuedJob,
  assertMediaAvailable,
  type ConversionJob,
} from './index.js';
import { defaultConversion, type Capabilities } from '@comet/contracts';

const queued = (): ConversionJob => ({
  id: 'job-1',
  batchId: 'batch-1',
  itemId: 'source-1',
  name: 'source.mp4',
  sizeBytes: 256,
  mediaType: 'video',
  outputFormat: 'mp4',
  state: 'queued',
  progress: 0,
});

it('advances FIFO across media after ordinary failures and enforces live batches', () => {
  const first = applyJobEvent(queued(), { type: 'started', at: 1 });
  const second: ConversionJob = {
    ...queued(),
    id: 'audio',
    batchId: 'audio-batch',
    mediaType: 'audio',
  };
  const third = { ...queued(), id: 'later-video' };
  const jobs = [first, second, third];
  expect(nextQueuedJob(jobs)).toBe(second);
  expect(() => assertMediaAvailable(jobs, 'video')).toThrow('submitted batch');
  const failed = applyJobEvent(first, {
    type: 'failed',
    at: 2,
    error: { code: 'BAD_INPUT', message: 'Corrupt input' },
  });
  expect(() => assertMediaAvailable([failed, second], 'video')).not.toThrow();
  expect(nextQueuedJob([failed, second, third])).toBe(second);
  expect(nextQueuedJob([failed])).toBeUndefined();
});

describe('portable lifecycle', () => {
  it('retains metadata ownership after an adapter reports progress', () => {
    const metadata = {
      duration: 1,
      width: 8,
      height: 6,
      videoCodec: null,
      frames: 1,
      audio: [],
    };
    const job = applyJobEvent(
      applyJobEvent(queued(), { type: 'started', at: 1 }),
      {
        type: 'progress',
        value: 20,
        metadata,
      },
    );
    metadata.width = 999;
    expect(job.metadata?.width).toBe(8);
  });
  it('keeps queued input immutable and emits a terminal transition once', () => {
    const source = queued();
    const running = applyJobEvent(source, { type: 'started', at: 10 });
    const finished = applyJobEvent(running, { type: 'succeeded', at: 20 });
    expect(source.state).toBe('queued');
    expect(finished).toMatchObject({
      state: 'succeeded',
      progress: 100,
      startedAt: 10,
      completedAt: 20,
    });
    expect(applyJobEvent(finished, { type: 'progress', value: 5 })).toBe(
      finished,
    );
    expect(applyJobEvent(finished, { type: 'canceled', at: 30 })).toBe(
      finished,
    );
  });

  it('waits in canceling until the adapter reports cleanup complete', () => {
    const running = applyJobEvent(queued(), { type: 'started', at: 1 });
    const canceling = applyJobEvent(running, { type: 'cancel-requested' });
    expect(canceling.state).toBe('canceling');
    expect(applyJobEvent(canceling, { type: 'cancel-requested' })).toBe(
      canceling,
    );
    expect(applyJobEvent(canceling, { type: 'succeeded', at: 2 })).toBe(
      canceling,
    );
    expect(applyJobEvent(canceling, { type: 'progress', value: 99 })).toBe(
      canceling,
    );
    expect(applyJobEvent(canceling, { type: 'canceled', at: 3 })).toMatchObject(
      {
        state: 'canceled',
        progress: 0,
        completedAt: 3,
      },
    );
    expect(applyJobEvent(queued(), { type: 'canceled', at: 1 }).state).toBe(
      'canceled',
    );
  });

  it('ignores invalid progress and reserves 100 percent for success', () => {
    const running = applyJobEvent(queued(), { type: 'started', at: 1 });
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(applyJobEvent(running, { type: 'progress', value })).toBe(running);
    }

    expect(
      applyJobEvent(running, { type: 'progress', value: 1000 }).progress,
    ).toBe(99);
    expect(
      applyJobEvent(running, { type: 'progress', value: null }).progress,
    ).toBeNull();
    expect(() => applyJobEvent(queued(), { type: 'started', at: NaN })).toThrow(
      'timestamp',
    );
  });

  it('retains structured failures and ignores late updates', () => {
    const running = applyJobEvent(queued(), { type: 'started', at: 1 });
    const error = { code: 'BAD_INPUT', message: 'Unsupported source' };
    const failed = applyJobEvent(running, { type: 'failed', at: 2, error });
    expect(failed.error).toEqual(error);
    expect(applyJobEvent(failed, { type: 'succeeded', at: 3 })).toBe(failed);
  });
});

it('accepts only newer snapshots without cloning state on repeated delivery', () => {
  const current = { revision: 5, jobs: [queued()] };
  expect(acceptQueueSnapshot(current, { revision: 4, jobs: [] })).toBe(current);
  expect(acceptQueueSnapshot(current, { revision: 5, jobs: [] })).toBe(current);
  const next = { revision: 6, jobs: [queued()] };
  expect(acceptQueueSnapshot(current, next)).toBe(next);
});

it('selects outputs by target kind and actual codec capabilities', () => {
  const capabilities: Capabilities = {
    video: [{ format: 'mp4', available: true, codecs: ['h264'] }],
    audio: [{ format: 'mp3', available: true }],
    image: [{ format: 'webp', available: false }],
  };
  expect(() =>
    assertOutputAvailable(
      capabilities,
      'video',
      'mp3',
      defaultConversion('audio'),
    ),
  ).not.toThrow();
  expect(() => assertOutputAvailable(capabilities, 'image', 'webp')).toThrow(
    'unavailable',
  );
  expect(() =>
    assertOutputAvailable(
      capabilities,
      'image',
      'mp3',
      defaultConversion('audio'),
    ),
  ).toThrow('source/target');
  expect(() =>
    assertOutputAvailable(capabilities, 'video', 'mp4', {
      ...defaultConversion('video'),
      kind: 'video',
      codec: 'hevc',
    }),
  ).toThrow('codec');
});

it('serializes domain fields without leaking native adapter handles', () => {
  const native = {
    ...queued(),
    inputPath: '/private/source.mp4',
    outputDirectory: '/private/output',
    outputPath: '/private/output/source.mp4',
  };
  const json = serializeQueue({
    revision: 1,
    batches: [{ id: 'batch-1', mediaType: 'video', jobIds: ['job-1'] }],
    jobs: [native],
  });
  expect(json).not.toContain('/private');
  expect(JSON.parse(json).jobs[0]).toEqual(queued());
  expect(() =>
    serializeQueue({ revision: NaN, batches: [], jobs: [] }),
  ).toThrow();
});
