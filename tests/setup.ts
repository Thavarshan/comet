// test/setup.ts
import { vi } from 'vitest';

// Example: global mock for Electron if needed
vi.mock('electron', () => ({
  app: {
    on: vi.fn(),
    quit: vi.fn(),
  },
  BrowserWindow: vi.fn(),
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));
