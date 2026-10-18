import { describe, expect, it, vi } from 'vitest';
import { ConversionEngine, type Executor } from './index';
import {
  formats,
  type BatchRequest,
  type Capabilities,
  type MediaType,
} from '@comet/contracts';

const capabilities = Object.fromEntries(
  Object.entries(formats).map(([media, values]) => [
    media,
    values.map((format) => ({ format, available: true })),
  ]),
) as Capabilities;

function batch(mediaType: MediaType = 'video', count = 2): BatchRequest {
  return {
    mediaType,
    items: Array.from({ length: count }, (_, index) => ({
      itemId: `${mediaType}-${index}`,
      inputPath: `/tmp/input${index}.mp4`,
      name: `input${index}.mp4`,
      sizeBytes: 123,
    })),
    outputFormat: mediaType === 'video' ? 'mp4' : 'mp3',
    outputDirectory: '/tmp',
  };
}

function controlled() {
  const started: string[] = [];
  const pending: { finish: () => void; fail: () => void }[] = [];
  let active = 0;
  let maximum = 0;
  const execute: Executor = (job, signal, progress) =>
    new Promise((resolve, reject) => {
      started.push(job.itemId);
      active++;
      maximum = Math.max(maximum, active);
      progress(45);
      const finish = () => {
        active--;
        progress(1000);
        resolve('/tmp/comet-test-output-does-not-exist');
      };

      pending.push({
        finish,
        fail: () => {
          active--;
          reject(new Error('bad input'));
        },
      });
      signal.addEventListener(
        'abort',
        () => {
          setTimeout(() => {
            active--;
            progress(99);
            reject(new DOMException('Canceled', 'AbortError'));
          }, 5);
        },
        { once: true },
      );
    });

  return { execute, started, pending, maximum: () => maximum };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 15));

it('does not mutate completed metadata when an executor reports late progress', async () => {
  let late: Parameters<Executor>[2] | undefined;
  const metadata = {
    duration: 1,
    width: 8,
    height: 8,
    videoCodec: 'h264',
    frames: 1,
    audio: [],
  };
  const execute: Executor = async (_job, _signal, progress) => {
    late = progress;
    progress(0, metadata);

    return '/tmp/comet-late-progress-output';
  };
  const engine = new ConversionEngine(capabilities, execute, async () => {});
  try {
    await engine.enqueueBatch(batch('video', 1));
    await tick();
    expect(engine.getSnapshot().jobs[0]?.state).toBe('succeeded');
    const revision = engine.getSnapshot().revision;
    late?.(50, { ...metadata, width: 999 });
    expect(engine.getSnapshot().revision).toBe(revision);
    expect(engine.getSnapshot().jobs[0]?.metadata?.width).toBe(8);
  } finally {
    await engine.shutdown();
  }
});

describe('global conversion scheduler', () => {
  it('preserves arrival order while a submission waits for directory validation', async () => {
    const c = controlled();
    let release!: () => void;
    const validation = new Promise<void>((resolve) => {
      release = resolve;
    });
    const validate = vi
      .fn()
      .mockImplementationOnce(() => validation)
      .mockResolvedValue(undefined);
    const engine = new ConversionEngine(capabilities, c.execute, validate);
    const first = engine.enqueueBatch(batch('video', 1));
    const second = engine.enqueueBatch(batch('audio', 1));
    await tick();
    expect(c.started).toEqual([]);
    release();
    await Promise.all([first, second]);
    expect(c.started).toEqual(['video-0']);
    c.pending[0]!.finish();
    await tick();
    expect(c.started).toEqual(['video-0', 'audio-0']);
    await engine.shutdown();
  });
  it('runs FIFO across tabs with one active job and immutable submitted settings', async () => {
    const c = controlled();
    const engine = new ConversionEngine(
      capabilities,
      c.execute,
      async () => {},
    );
    const request = batch();
    await engine.enqueueBatch(request);
    await engine.enqueueBatch(batch('audio', 1));
    request.outputFormat = 'mkv';
    request.items[0]!.name = 'changed';
    expect(engine.getSnapshot().jobs[0]!.outputFormat).toBe('mp4');
    expect(engine.getSnapshot().jobs[0]!.name).toBe('input0.mp4');
    expect(c.started).toEqual(['video-0']);
    c.pending[0]!.finish();
    await tick();
    c.pending[1]!.finish();
    await tick();
    c.pending[2]!.finish();
    await tick();
    expect(c.started).toEqual(['video-0', 'video-1', 'audio-0']);
    expect(c.maximum()).toBe(1);
    expect(
      engine.getSnapshot().jobs.every((job) => job.state === 'succeeded'),
    ).toBe(true);
    await engine.shutdown();
  });
  it('cancels the selected batch after cleanup and leaves another tab running', async () => {
    const c = controlled();
    const engine = new ConversionEngine(
      capabilities,
      c.execute,
      async () => {},
    );
    const snapshot = await engine.enqueueBatch(batch());
    await engine.enqueueBatch(batch('audio', 1));
    await engine.cancelBatch(snapshot.batches[0]!.id);
    expect(
      engine
        .getSnapshot()
        .jobs.slice(0, 2)
        .map((job) => job.state),
    ).toEqual(['canceled', 'canceled']);
    expect(c.started).toEqual(['video-0', 'audio-0']);
    expect(c.maximum()).toBe(1);
    c.pending[1]!.finish();
    await tick();
    await engine.shutdown();
  });
  it('cancels a waiting batch without affecting the active job', async () => {
    const c = controlled();
    const engine = new ConversionEngine(
      capabilities,
      c.execute,
      async () => {},
    );
    await engine.enqueueBatch(batch('video', 1));
    const audio = await engine.enqueueBatch(batch('audio', 1));
    await engine.cancelBatch(audio.batches[1]!.id);
    expect(engine.getSnapshot().jobs[0]!.state).toBe('running');
    c.pending[0]!.finish();
    await tick();
    expect(c.started).toEqual(['video-0']);
    await engine.shutdown();
  });
  it('individual cancellation continues siblings, settles once, and ignores late progress', async () => {
    const c = controlled();
    const engine = new ConversionEngine(
      capabilities,
      c.execute,
      async () => {},
    );
    await engine.enqueueBatch(batch());
    const first = engine.getSnapshot().jobs[0]!;
    await engine.cancelJob(first.id);
    expect(engine.getSnapshot().jobs[0]!.state).toBe('canceled');
    expect(engine.getSnapshot().jobs[0]!.progress).toBe(0);
    expect(c.started).toEqual(['video-0', 'video-1']);
    expect(await engine.cancelJob(first.id)).toEqual({
      status: 'already-terminal',
    });
    expect(await engine.cancelJob('missing')).toEqual({ status: 'not-found' });
    await engine.shutdown();
  });
  it('advances after failure and rejects a second nonterminal batch per media', async () => {
    const c = controlled();
    const engine = new ConversionEngine(
      capabilities,
      c.execute,
      async () => {},
    );
    await engine.enqueueBatch(batch());
    await expect(engine.enqueueBatch(batch())).rejects.toThrow('already');
    c.pending[0]!.fail();
    await tick();
    expect(c.started).toHaveLength(2);
    expect(engine.getSnapshot().jobs[0]!.state).toBe('failed');
    await engine.shutdown();
  });
  it('returns detached snapshots and isolates listener cleanup', async () => {
    const c = controlled();
    const engine = new ConversionEngine(
      capabilities,
      c.execute,
      async () => {},
    );
    const one = vi.fn();
    const two = vi.fn();
    const unsubscribe = engine.subscribe(one);
    engine.subscribe(two);
    unsubscribe();
    await engine.enqueueBatch(batch('video', 1));
    const snapshot = engine.getSnapshot();
    snapshot.jobs[0]!.state = 'succeeded';
    expect(engine.getSnapshot().jobs[0]!.state).toBe('running');
    expect(one).not.toHaveBeenCalled();
    expect(two).toHaveBeenCalled();
    await engine.shutdown();
    await expect(engine.enqueueBatch(batch())).rejects.toThrow('shutting down');
  });
  it('clears only terminal media and removes retry history without losing other tabs', async () => {
    const engine = new ConversionEngine(
      capabilities,
      async () => '/tmp/result',
      async () => {},
    );
    await engine.enqueueBatch(batch('audio', 1));
    await tick();
    await engine.enqueueBatch(batch('video', 1));
    await tick();
    engine.clearMedia('video');
    expect(engine.getSnapshot().jobs.map((job) => job.mediaType)).toEqual([
      'audio',
    ]);
    engine.removeItem('audio-0');
    expect(engine.getSnapshot().jobs).toEqual([]);
    expect(engine.getSnapshot().batches).toEqual([]);
    await engine.shutdown();
  });
});
