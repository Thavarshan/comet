import { expect, it, vi } from 'vitest';
import { createBridge } from './bridge';
import { channels } from '@honeymelon/contracts';

it('passes only payloads and removes only its own subscription', async () => {
  const listeners = new Map<
    string,
    Set<(_event: unknown, payload: unknown) => void>
  >();
  const transport = {
    invoke: vi.fn().mockResolvedValue({ ok: true, value: null }),
    on: (
      channel: string,
      callback: (_event: unknown, payload: unknown) => void,
    ) => {
      const set = listeners.get(channel) ?? new Set();
      set.add(callback);
      listeners.set(channel, set);
    },
    removeListener: (
      channel: string,
      callback: (_event: unknown, payload: unknown) => void,
    ) => {
      listeners.get(channel)?.delete(callback);
    },
  };
  const bridge = createBridge(transport, () => '/tmp/file');
  const first = vi.fn();
  const second = vi.fn();
  const unsubscribe = bridge.onQueueChanged(first);
  bridge.onQueueChanged(second);
  unsubscribe();
  unsubscribe();
  for (const callback of listeners.get(channels.queueChanged)!) {
    callback({ secret: true }, { revision: 3 });
  }

  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledWith({ revision: 3 });
  expect(Object.keys(bridge)).not.toContain('send');
  await bridge.cancelBatch('id');
  expect(transport.invoke).toHaveBeenCalledWith(channels.cancelBatch, 'id');
});
