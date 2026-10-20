import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { createBridge } from './bridge.js';

contextBridge.exposeInMainWorld(
  'honeymelon',
  createBridge(ipcRenderer, (file) => webUtils.getPathForFile(file)),
);
