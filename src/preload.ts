// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  getDownloadsPath: () => ipcRenderer.invoke('getDownloadsPath'),
  convertVideo: (filePath: string, outputFormat: string, saveDirectory: string) => {
    return ipcRenderer.invoke('convert-video', { filePath, outputFormat, saveDirectory });
  },
});
