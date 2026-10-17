import { spawn } from 'node:child_process';

/**
 * Spawn a native tool without a shell and collect bounded diagnostic output.
 *
 * Cancellation first requests termination, then escalates after a grace period.
 * The promise settles on process close so callers can safely clean up files.
 */
export async function runProcess(
  executable: string,
  args: string[],
  signal: AbortSignal,
  onOutput?: (chunk: string) => void,
): Promise<{ stdout: string; stderr: string }> {
  signal.throwIfAborted();

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => {
      child.kill('SIGTERM');
      timer ??= setTimeout(() => child.kill('SIGKILL'), 1500);
      timer.unref();
    };

    const cleanup = () => {
      signal.removeEventListener('abort', abort);
      clearTimeout(timer);
    };

    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      abort();
    }

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout = (stdout + text).slice(-8 * 1024 * 1024);
      onOutput?.(text);
    });
    child.stderr.on('data', (data: Buffer) => {
      stderr = (stderr + data.toString()).slice(-16384);
    });
    child.once('error', (error) => {
      cleanup();
      reject(error);
    });
    child.once('close', (code) => {
      cleanup();
      if (signal.aborted) {
        reject(new DOMException('Conversion canceled', 'AbortError'));
      } else if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr.trim() || `Process exited with code ${code}`));
      }
    });
  });
}
