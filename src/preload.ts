// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import {
  contextBridge,
  ipcRenderer,
  IpcRendererEvent,
  webUtils
} from 'electron';
import { IpcEvent } from './enum/ipc-event';

async function preload() {
  await setupGlobals();
}

export async function setupGlobals() {
  contextBridge.exposeInMainWorld('electron', {
    arch: process.arch,
    selectDirectory() {
      return ipcRenderer.invoke(IpcEvent.DIALOG_SELECT_DIRECTORY);
    },
    getDesktopPath() {
      return ipcRenderer.invoke(IpcEvent.GET_DESKTOP_PATH);
    },
    getFilePath: (file: File) => {
      return webUtils.getPathForFile(file);
    },
    cancelConversion(id: number) {
      return ipcRenderer.invoke(IpcEvent.CANCEL_CONVERSION, id);
    },
    convertVideo(
      id: string,
      filePath: string,
      outputFormat: string,
      saveDirectory: string
    ) {
      return ipcRenderer.invoke(
        IpcEvent.CONVERT_VIDEO,
        { id, filePath, outputFormat, saveDirectory }
      );
    },
    on(channel: string, callback: (
      event: IpcRendererEvent,
      ...args: unknown[]) => void
    ) {
      ipcRenderer.on(channel, callback);
    },
    removeAllListeners(channel: string) {
      ipcRenderer.removeAllListeners(channel);
    }
  });
}

preload();
