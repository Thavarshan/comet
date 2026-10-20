import { expect, it, vi } from 'vitest';
import type { Capabilities, MediaMetadata } from '@honeymelon/contracts';
import type { ConversionService } from '@honeymelon/core';
import { ConversionEngine, NativeConversionService } from './index';

const capabilities: Capabilities = {
  video: [{ format: 'mp4', available: true }],
  audio: [],
  image: [],
};

it('gives concurrent probes independent abort identities', async () => {
  const engine = new ConversionEngine(capabilities, vi.fn(), async () => {});
  const pending = new Map<
    string,
    {
      resolve: (metadata: MediaMetadata) => void;
      reject: (error: Error) => void;
    }
  >();
  vi.spyOn(engine, 'inspectFile').mockImplementation(
    (source) =>
      new Promise((resolve, reject) => {
        pending.set(source.itemId, { resolve, reject });
      }),
  );
  const cancel = vi
    .spyOn(engine, 'cancelInspection')
    .mockImplementation((id) => {
      pending.get(id)?.reject(new DOMException('Canceled', 'AbortError'));
    });
  const service = new NativeConversionService(engine, capabilities);
  const file = service.registerInput({
    itemId: 'source',
    inputPath: '/private/source.mp4',
    name: 'source.mp4',
    sizeBytes: 100,
  });
  const controller = new AbortController();
  const first = service.probe(file, controller.signal);
  const second = service.probe(file);
  const rejection = expect(first).rejects.toMatchObject({ name: 'AbortError' });
  expect(pending.size).toBe(2);
  controller.abort();
  await rejection;
  expect(cancel).toHaveBeenCalledTimes(1);
  const metadata: MediaMetadata = {
    duration: null,
    width: null,
    height: null,
    videoCodec: null,
    frames: null,
    audio: [],
  };
  for (const probe of pending.values()) {
    probe.resolve(metadata);
  }

  expect(await second).toEqual(metadata);
  await service.dispose();
});

it('resolves opaque handles, isolates progress, and awaits abort cleanup', async () => {
  let aborted = false;
  const engine = new ConversionEngine(
    capabilities,
    async (job, signal, report) => {
      expect(job.inputPath).toBe('/private/source.mp4');
      expect(job.outputDirectory).toBe('/private/output');
      report(40);

      return new Promise((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            aborted = true;
            reject(new DOMException('Canceled', 'AbortError'));
          },
          { once: true },
        );
      });
    },
    async () => {},
  );
  const native = new NativeConversionService(engine, capabilities);
  const service: ConversionService = native;
  const file = native.registerInput({
    itemId: 'source',
    inputPath: '/private/source.mp4',
    name: 'source.mp4',
    sizeBytes: 100,
  });
  const target = native.registerTarget('/private/output');
  const first = vi.fn();
  const second = vi.fn();
  const unsubscribe = service.subscribe(first);
  service.subscribe(second);
  unsubscribe();
  const discovered = await service.discoverCapabilities();
  discovered.video.length = 0;
  expect((await service.discoverCapabilities()).video).toHaveLength(1);
  try {
    await service.enqueue({
      mediaType: 'video',
      files: [file],
      target,
      outputFormat: 'mp4',
    });
    const queue = await service.getSnapshot();
    expect(queue.jobs[0]?.progress).toBe(40);
    expect(JSON.stringify(queue)).not.toContain('/private/');
    expect(queue.jobs[0]).not.toHaveProperty('inputPath');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
    const id = queue.jobs[0]!.id;
    expect(await service.cancelJob(id)).toEqual({ status: 'canceled' });
    expect(aborted).toBe(true);
    expect((await service.getSnapshot()).jobs[0]?.state).toBe('canceled');
    expect(await service.cancelJob(id)).toEqual({ status: 'already-terminal' });
  } finally {
    await service.dispose();
  }

  await service.dispose();
  await expect(service.getSnapshot()).rejects.toMatchObject({
    code: 'disposed',
  });
});

it('rejects foreign handles and unsupported outputs before execution', async () => {
  const execute = vi.fn();
  const engine = new ConversionEngine(capabilities, execute, async () => {});
  const service = new NativeConversionService(engine, capabilities);
  const file = service.registerInput({
    itemId: 'source',
    inputPath: '/private/source.mp4',
    name: 'source.mp4',
    sizeBytes: 100,
  });
  const target = service.registerTarget('/private/output');
  const request = {
    mediaType: 'video' as const,
    files: [file],
    target,
    outputFormat: 'mp4',
  };
  await expect(
    service.enqueue({
      ...request,
      target: { id: '/private/unregistered' },
    }),
  ).rejects.toMatchObject({ code: 'invalid-target' });
  await expect(
    service.enqueue({
      ...request,
      files: [{ ...file, id: 'foreign' }],
    }),
  ).rejects.toMatchObject({ code: 'invalid-input' });
  await expect(
    service.enqueue({ ...request, outputFormat: 'webm' }),
  ).rejects.toMatchObject({ code: 'unsupported' });
  const controller = new AbortController();
  controller.abort();
  await expect(service.probe(file, controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
  expect(execute).not.toHaveBeenCalled();
  await service.dispose();
});
