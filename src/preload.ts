import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Channel } from './enums/channel';

contextBridge.exposeInMainWorld('electron', {
  selectDirectory: () => ipcRenderer.invoke(Channel.DIALOG_SELECT_DIRECTORY),
  getDownloadsPath: () => ipcRenderer.invoke(Channel.GET_DOWNLOADS_PATH),
  convertVideo: (filePath: string, outputFormat: string, saveDirectory: string) => {
    return ipcRenderer.invoke(Channel.CONVERT_VIDEO, { filePath, outputFormat, saveDirectory });
  },
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => {
    ipcRenderer.on(channel, callback);
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
