import type { IpcMainInvokeEvent } from 'electron';
import type { Reply } from '@comet/contracts';

/**
 * Accept only the owning window and its trusted, top-level document.
 */
export function trustedSender(
  event: IpcMainInvokeEvent,
  windowId: number,
  developmentUrl?: string,
): boolean {
  if (
    event.sender.id !== windowId ||
    !event.senderFrame ||
    event.senderFrame !== event.sender.mainFrame
  ) {
    return false;
  }

  try {
    const url = new URL(event.senderFrame.url);

    return developmentUrl
      ? url.origin === new URL(developmentUrl).origin
      : url.protocol === 'file:' &&
          url.pathname.endsWith('/.vite/renderer/main_window/index.html');
  } catch {
    return false;
  }
}

/**
 * Convert thrown failures into a serializable desktop command envelope.
 */
export async function reply<T>(
  operation: () => T | Promise<T>,
): Promise<Reply<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    return {
      ok: false,
      error: {
        code:
          error instanceof Error && error.name === 'ZodError'
            ? 'INVALID_REQUEST'
            : 'OPERATION_FAILED',
        message: error instanceof Error ? error.message : 'Operation failed',
      },
    };
  }
}
