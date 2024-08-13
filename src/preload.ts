import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  getDownloadsPath: () => ipcRenderer.invoke('getDownloadsPath'),
  convertVideo: (filePath: string, outputFormat: string, saveDirectory: string) => {
    return ipcRenderer.invoke('convert-video', { filePath, outputFormat, saveDirectory });
  },
  on: (channel: string, callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) => {
    ipcRenderer.on(channel, callback);
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
