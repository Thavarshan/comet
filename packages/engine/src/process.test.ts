import { expect, it } from 'vitest';
import { runProcess } from './process';

it('waits for native process termination when canceled', async () => {
  const controller = new AbortController();
  const operation = runProcess(
    process.execPath,
    ['-e', 'setInterval(() => {}, 1000)'],
    controller.signal,
  );
  setTimeout(() => controller.abort(), 25);
  await expect(operation).rejects.toMatchObject({ name: 'AbortError' });
});
it('handles launch failures, nonzero exits and an already canceled probe', async () => {
  await expect(
    runProcess('/missing/comet-tool', [], new AbortController().signal),
  ).rejects.toThrow();
  await expect(
    runProcess(
      process.execPath,
      ['-e', 'process.exit(2)'],
      new AbortController().signal,
    ),
  ).rejects.toThrow('code 2');
  await expect(
    runProcess(process.execPath, [], AbortSignal.abort()),
  ).rejects.toMatchObject({
    name: 'AbortError',
  });
});
