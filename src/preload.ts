// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, IpcRendererEvent, webUtils } from 'electron';
import { IpcEvent } from './enum/ipc-event';
import { VideoFormat } from '@/enum/video-format';
import { AudioFormat } from '@/enum/audio-format';
import { ImageFormat } from '@/enum/image-format';
import { Media } from './types/media';
import { ColorMode } from './types/theme';

async function preload(): Promise<void> {
  await setupGlobals();
}

/**
 * Expose Electron API in the main world
 */
export async function setupGlobals(): Promise<void> {
  contextBridge.exposeInMainWorld('electron', {
    arch: process.arch,
    platform: process.platform,
    selectDirectory() {
      return ipcRenderer.invoke(IpcEvent.DIALOG_SELECT_DIRECTORY);
    },
    getSystemTheme() {
      return ipcRenderer.sendSync(IpcEvent.GET_SYSTEM_THEME) as ColorMode;
    },
    getDesktopPath() {
      return ipcRenderer.invoke(IpcEvent.GET_DESKTOP_PATH);
    },
    getFilePath: (file: File) => {
      return webUtils.getPathForFile(file);
    },
    cancelItemConversion(id: number) {
      return ipcRenderer.invoke(IpcEvent.CANCEL_ITEM_CONVERSION, id);
    },
    cancelConversion() {
      return ipcRenderer.invoke(IpcEvent.CANCEL_CONVERSION);
    },
    convertMedia(
      id: string,
      filePath: string,
      outputFormat: VideoFormat | AudioFormat | ImageFormat,
      saveDirectory: string,
      mediaType: Media,
    ) {
      return ipcRenderer.invoke(IpcEvent.CONVERT_MEDIA, { id, filePath, outputFormat, saveDirectory, mediaType });
    },
    send(channel: string, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) {
      ipcRenderer.on(channel, callback);
    },
    removeAllListeners(channel: string) {
      ipcRenderer.removeAllListeners(channel);
    },
  });
}

preload();
