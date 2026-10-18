import {
  channels,
  type DesktopBridge,
  type QueueSnapshot,
} from '@comet/contracts';

interface Transport {
  invoke(channel: string, payload?: unknown): Promise<unknown>;
  on(
    channel: string,
    listener: (_event: unknown, payload: unknown) => void,
  ): void;
  removeListener(
    channel: string,
    listener: (_event: unknown, payload: unknown) => void,
  ): void;
}

/**
 * Expose named commands and payload-only subscriptions to the renderer.
 * Raw Electron events and arbitrary channel access remain inside preload.
 */
export function createBridge(
  transport: Transport,
  getFilePath: (file: File) => string,
): DesktopBridge<File> {
  const invoke = <K extends keyof DesktopBridge<File>>(
    channel: string,
    payload?: unknown,
  ) => transport.invoke(channel, payload) as ReturnType<DesktopBridge<File>[K]>;

  function subscribe<T>(channel: string, callback: (payload: T) => void) {
    const listener = (_event: unknown, payload: unknown) =>
      callback(payload as T);
    transport.on(channel, listener);

    return () => transport.removeListener(channel, listener);
  }

  return {
    getEnvironment: () => invoke<'getEnvironment'>(channels.environment),
    getPreferences: () => invoke<'getPreferences'>(channels.preferences),
    savePreferences: (value) =>
      invoke<'savePreferences'>(channels.savePreferences, value),
    importLegacyPreferences: (value) =>
      invoke<'importLegacyPreferences'>(channels.importLegacy, value),
    selectDirectory: (media) =>
      invoke<'selectDirectory'>(channels.directory, media),
    getFilePath,
    enqueueBatch: (value) => invoke<'enqueueBatch'>(channels.enqueue, value),
    cancelJob: (id) => invoke<'cancelJob'>(channels.cancelJob, id),
    cancelBatch: (id) => invoke<'cancelBatch'>(channels.cancelBatch, id),
    removeItem: (id) => invoke<'removeItem'>(channels.removeItem, id),
    clearMedia: (media) => invoke<'clearMedia'>(channels.clearMedia, media),
    getSnapshot: () => invoke<'getSnapshot'>(channels.snapshot),
    onQueueChanged: (callback) =>
      subscribe<QueueSnapshot>(channels.queueChanged, callback),
    onThemeChanged: (callback) =>
      subscribe<'light' | 'dark'>(channels.themeChanged, callback),
    titlebarDoubleClick: () => invoke<'titlebarDoubleClick'>(channels.titlebar),
    showWindow: () => invoke<'showWindow'>(channels.show),
    inspectFile: (file) => invoke<'inspectFile'>(channels.inspect, file),
    cancelInspection: (id) =>
      invoke<'cancelInspection'>(channels.cancelInspection, id),
    revealOutput: (id) => invoke<'revealOutput'>(channels.reveal, id),
  };
}
