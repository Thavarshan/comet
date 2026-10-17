// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultPreferences,
  formats,
  type DesktopBridge,
  type QueueSnapshot,
  type BatchRequest,
  type Capabilities,
} from '@comet/contracts';
import { App } from './App';
import { AppProvider, initialState, reducer } from './state';
import i18n from './i18n';

const capabilities = Object.fromEntries(
  Object.entries(formats).map(([media, values]) => [
    media,
    values.map((format) => ({
      format,
      available: !['gif', 'tiff', 'ape', 'mpc'].includes(format),
    })),
  ]),
) as Capabilities;
let listeners: Set<(snapshot: QueueSnapshot) => void>;
let themeListeners: Set<(theme: 'light' | 'dark') => void>;
let snapshot: QueueSnapshot;

const ok = <T,>(value: T) => ({ ok: true as const, value });

function fakeBridge(): DesktopBridge<File> {
  let preferences = { ...defaultPreferences('/tmp'), legacyImported: true };

  return {
    getEnvironment: vi.fn<DesktopBridge<File>['getEnvironment']>(async () => ({
      ok: true,
      value: {
        capabilities,
        platform: 'linux',
        systemTheme: 'light',
        version: '2.2.3',
      },
    })),
    getPreferences: vi.fn<DesktopBridge<File>['getPreferences']>(async () => ({
      ok: true,
      value: preferences,
    })),
    savePreferences: vi.fn<DesktopBridge<File>['savePreferences']>(
      async (value) => {
        preferences = value;

        return { ok: true, value };
      },
    ),
    importLegacyPreferences: vi.fn<
      DesktopBridge<File>['importLegacyPreferences']
    >(async () => ({
      ok: true,
      value: preferences,
    })),
    getFilePath: vi.fn<DesktopBridge<File>['getFilePath']>(
      (file) => `/tmp/${file.name}`,
    ),
    selectDirectory: vi.fn<DesktopBridge<File>['selectDirectory']>(
      async () => ({
        ok: true,
        value: null,
      }),
    ),
    getSnapshot: vi.fn<DesktopBridge<File>['getSnapshot']>(async () => ({
      ok: true,
      value: snapshot,
    })),
    enqueueBatch: vi.fn<DesktopBridge<File>['enqueueBatch']>(
      async (request: BatchRequest) => {
        const batchId = crypto.randomUUID();
        const jobs = request.items.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
          batchId,
          mediaType: request.mediaType,
          outputFormat: request.outputFormat,
          outputDirectory: request.outputDirectory,
          spec: request.spec,
          state: 'queued' as const,
          progress: 0,
        }));
        snapshot = {
          revision: snapshot.revision + 1,
          jobs: [...snapshot.jobs, ...jobs],
          batches: [
            ...snapshot.batches,
            {
              id: batchId,
              mediaType: request.mediaType,
              jobIds: jobs.map((job) => job.id),
            },
          ],
        };
        for (const listener of listeners) {
          listener(snapshot);
        }

        return { ok: true, value: snapshot };
      },
    ),
    cancelJob: vi.fn<DesktopBridge<File>['cancelJob']>(async () => ({
      ok: true,
      value: { status: 'canceled' },
    })),
    cancelBatch: vi.fn<DesktopBridge<File>['cancelBatch']>(async () => ({
      ok: true,
      value: { status: 'canceled' },
    })),
    removeItem: vi.fn<DesktopBridge<File>['removeItem']>(async () => ({
      ok: true,
      value: { revision: ++snapshot.revision, batches: [], jobs: [] },
    })),
    clearMedia: vi.fn<DesktopBridge<File>['clearMedia']>(async () => ({
      ok: true,
      value: { revision: ++snapshot.revision, batches: [], jobs: [] },
    })),
    onQueueChanged: (callback) => {
      listeners.add(callback);

      return () => {
        listeners.delete(callback);
      };
    },
    onThemeChanged: (callback) => {
      themeListeners.add(callback);

      return () => {
        themeListeners.delete(callback);
      };
    },
    titlebarDoubleClick: vi.fn<DesktopBridge<File>['titlebarDoubleClick']>(
      async () => ({
        ok: true,
        value: undefined,
      }),
    ),
    inspectFile: vi.fn(async () =>
      ok({
        duration: null,
        width: null,
        height: null,
        videoCodec: null,
        frames: null,
        audio: [],
      }),
    ),
    cancelInspection: vi.fn(async () => ok(undefined)),
    revealOutput: vi.fn(async () => ok(undefined)),
    showWindow: vi.fn<DesktopBridge<File>['showWindow']>(async () => ({
      ok: true,
      value: undefined,
    })),
  };
}

beforeEach(async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}

      unobserve() {}

      disconnect() {}
    },
  );
  // JSDOM does not implement pointer capture used by Radix Select.
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  listeners = new Set();
  themeListeners = new Set();
  snapshot = { revision: 0, jobs: [], batches: [] };
  localStorage.clear();
  await i18n.changeLanguage('en');
  window.comet = fakeBridge();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function start() {
  const view = render(
    <StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </StrictMode>,
  );
  await screen.findByRole('tab', { name: 'Video' });

  return view;
}

const panel = () => screen.getByRole('tabpanel');
const picker = () =>
  within(panel()).getByLabelText('Add files') as HTMLInputElement;
describe('React conversion workflows', () => {
  it('keeps subscriptions balanced under StrictMode and discards stale snapshots', async () => {
    const view = await start();
    expect(listeners.size).toBe(1);
    expect(themeListeners.size).toBe(1);
    const newest = reducer(initialState, {
      type: 'queue',
      queue: { ...snapshot, revision: 10 },
    });
    expect(
      reducer(newest, { type: 'queue', queue: { ...snapshot, revision: 2 } }),
    ).toBe(newest);
    view.unmount();
    expect(listeners.size).toBe(0);
    expect(themeListeners.size).toBe(0);
  });
  it('accepts uppercase extensions, reports rejected files and allows the same file to be selected again', async () => {
    await start();
    const file = new File(['video'], 'MOVIE.MP4', { type: 'video/mp4' });
    fireEvent.change(picker(), {
      target: { files: [file, new File(['x'], 'bad.exe')] },
    });
    expect(screen.getByText('MOVIE.MP4')).toBeVisible();
    expect(
      screen.getByText(/Unsupported files were skipped/),
    ).toHaveTextContent('bad.exe');
    expect(picker().value).toBe('');
    fireEvent.change(picker(), { target: { files: [file] } });
    expect(screen.getAllByText('MOVIE.MP4')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Convert' }));
    expect(window.comet.enqueueBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        outputFormat: 'mp4',
        items: expect.any(Array),
      }),
    );
    expect(window.comet.enqueueBatch).toHaveBeenCalledTimes(1);
  });
  it('preserves drafts across tabs and shares validation between picker and drop', async () => {
    await start();
    fireEvent.change(picker(), {
      target: { files: [new File(['video'], 'video.mp4')] },
    });
    await userEvent.click(screen.getByRole('tab', { name: 'Audio' }));
    fireEvent.drop(
      within(panel()).getByRole('heading', { name: /Drag and drop/ })
        .parentElement!,
      {
        dataTransfer: {
          files: [new File(['audio'], 'sound.WAV'), new File(['x'], 'bad.exe')],
        },
      },
    );
    expect(screen.getByText('sound.WAV')).toBeVisible();
    expect(
      screen.getByText(/Unsupported files were skipped/),
    ).toHaveTextContent('bad.exe');
    await userEvent.click(screen.getByRole('tab', { name: 'Video' }));
    expect(screen.getByText('video.mp4')).toBeVisible();
  });
  it('keeps richer output controls in a dismissible dialog', async () => {
    await start();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Output settings' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Task')).toBeVisible();
    expect(within(dialog).getByLabelText('Task')).toHaveFocus();
    expect(within(dialog).getAllByRole('heading')).toHaveLength(1);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Output settings' }),
    ).toHaveFocus();
  });
  it('describes icon actions with a tooltip on keyboard focus', async () => {
    await start();
    screen.getByRole('button', { name: 'Settings' }).focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Settings');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Ctrl');
    expect(screen.getByRole('button', { name: 'Clear' })).not.toHaveClass(
      'queue',
    );
  });
  it('keeps advanced select values and automatic defaults in preferences', async () => {
    await start();
    await userEvent.click(
      screen.getByRole('button', { name: 'Output settings' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Advanced options' }),
    );
    const resolution = screen.getByRole('combobox', { name: 'Dimensions' });
    await userEvent.click(resolution);
    await userEvent.click(screen.getByRole('option', { name: '720p' }));
    expect(window.comet.savePreferences).toHaveBeenLastCalledWith(
      expect.objectContaining({
        media: expect.objectContaining({
          video: expect.objectContaining({
            spec: expect.objectContaining({ height: 720 }),
          }),
        }),
      }),
    );
    await userEvent.click(resolution);
    await userEvent.click(
      screen.getByRole('option', { name: 'Keep original' }),
    );
    expect(resolution).toHaveTextContent('Keep original');
    const saved = vi.mocked(window.comet.savePreferences).mock.lastCall?.[0];
    expect(saved?.media.video.spec).not.toHaveProperty('height');
  });
  it('leaves destination unchanged when the native picker is canceled', async () => {
    await start();
    await userEvent.click(screen.getByRole('button', { name: 'Save to' }));
    expect(window.comet.selectDirectory).toHaveBeenCalled();
    expect(window.comet.savePreferences).not.toHaveBeenCalled();
  });
  it('cancels only the selected tab batch and retains queued settings', async () => {
    await start();
    fireEvent.change(picker(), {
      target: { files: [new File(['video'], 'video.mp4')] },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Convert' }));
    const videoBatchId = snapshot.batches[0]!.id;
    await userEvent.click(screen.getByRole('tab', { name: 'Audio' }));
    fireEvent.change(picker(), {
      target: { files: [new File(['audio'], 'audio.wav')] },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Convert' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel batch' }));
    expect(window.comet.cancelBatch).toHaveBeenCalledWith(
      snapshot.batches[1]!.id,
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Video' }));
    expect(within(panel()).getByLabelText('Output format')).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel batch' }));
    expect(window.comet.cancelBatch).toHaveBeenLastCalledWith(videoBatchId);
  });
  it('shows native progress and retries failed jobs with fresh submission', async () => {
    await start();
    fireEvent.change(picker(), {
      target: { files: [new File(['video'], 'video.mp4')] },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Convert' }));
    await act(async () => {
      snapshot = {
        ...snapshot,
        revision: snapshot.revision + 1,
        jobs: snapshot.jobs.map((job) => ({
          ...job,
          state: 'running',
          progress: 50,
        })),
      };
      listeners.forEach((listener) => listener(snapshot));
    });
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    await act(async () => {
      snapshot = {
        ...snapshot,
        revision: snapshot.revision + 1,
        jobs: snapshot.jobs.map((job) => ({
          ...job,
          state: 'failed',
          error: { code: 'CONVERSION_FAILED', message: 'invalid input' },
        })),
      };
      listeners.forEach((listener) => listener(snapshot));
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry: video.mp4' }),
    );
    expect(window.comet.enqueueBatch).toHaveBeenCalledTimes(2);
  });
  it('provides startup recovery and localized settings with an explicit system theme', async () => {
    vi.mocked(window.comet.getEnvironment).mockResolvedValue({
      ok: false,
      error: { code: 'OPERATION_FAILED', message: 'unavailable' },
    });
    render(
      <AppProvider>
        <App />
      </AppProvider>,
    );
    await screen.findByRole('heading', { name: 'Comet could not get ready' });
    window.comet.getEnvironment = fakeBridge().getEnvironment;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('tab', { name: 'Video' });
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Appearance' }));
    await userEvent.click(screen.getByRole('option', { name: 'Dark' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    await userEvent.click(screen.getByRole('combobox', { name: 'Language' }));
    await userEvent.click(screen.getByRole('option', { name: 'Español' }));
    await screen.findByRole('heading', { name: 'Ajustes' });
    expect(
      screen.getByRole('combobox', { name: 'Apariencia' }),
    ).toHaveTextContent('Oscuro');
    await userEvent.click(screen.getByRole('combobox', { name: 'Apariencia' }));
    await userEvent.click(screen.getByRole('option', { name: 'Sistema' }));
    await act(async () => {
      themeListeners.forEach((listener) => listener('light'));
    });
    await waitFor(() =>
      expect(document.documentElement).not.toHaveClass('dark'),
    );
  });
  it('renders interpolated upload labels for every retained locale', async () => {
    for (const locale of ['en', 'es', 'fr', 'de', 'ru']) {
      await i18n.changeLanguage(locale);
      expect(
        i18n.t('upload.title', { type: i18n.t('media.image') }),
      ).not.toMatch(/[{}]/);
      expect(i18n.t('ui.cancelBatch')).not.toBe('ui.cancelBatch');
    }
  });
});
