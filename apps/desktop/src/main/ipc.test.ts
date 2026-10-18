import { expect, it } from 'vitest';
import type { IpcMainInvokeEvent } from 'electron';
import { trustedSender, reply } from './ipc';

it('accepts only the owning main frame at the expected origin', () => {
  const frame = {
    url: 'file:///Applications/Comet.app/Contents/Resources/app.asar/.vite/renderer/main_window/index.html',
  };
  const event = {
    sender: { id: 1, mainFrame: frame },
    senderFrame: frame,
  } as unknown as IpcMainInvokeEvent;
  expect(trustedSender(event, 1)).toBe(true);
  expect(trustedSender(event, 2)).toBe(false);
  expect(
    trustedSender(
      { ...event, senderFrame: { url: frame.url } } as IpcMainInvokeEvent,
      1,
    ),
  ).toBe(false);
  frame.url = 'https://evil.test/.vite/renderer/main_window/index.html';
  expect(trustedSender(event, 1)).toBe(false);
  frame.url = 'http://localhost:1234';
  expect(trustedSender(event, 1, 'http://localhost:1234')).toBe(true);
  frame.url = 'http://localhost:1234.evil.test';
  expect(trustedSender(event, 1, 'http://localhost:1234')).toBe(false);
});
it('returns structured success and failure replies', async () => {
  expect(await reply(() => 'value')).toEqual({ ok: true, value: 'value' });
  expect(
    await reply(() => {
      throw new Error('failure');
    }),
  ).toEqual({
    ok: false,
    error: { code: 'OPERATION_FAILED', message: 'failure' },
  });
});
