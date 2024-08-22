// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import {
  contextBridge,
  ipcRenderer,
  IpcRendererEvent,
  webUtils
} from 'electron';

contextBridge.exposeInMainWorld('electron', {
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  getDesktopPath: () => ipcRenderer.invoke('get-desktop-path'),
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  convertVideo: (
    filePath: string,
    outputFormat: string,
    saveDirectory: string
  ) => {
    return ipcRenderer.invoke(
      'convert-video',
      { filePath, outputFormat, saveDirectory }
    );
  },
  on: (
    channel: string,
    callback: (event: IpcRendererEvent, ...args: unknown[]) => void
  ) => {
    ipcRenderer.on(channel, callback);
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
