import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  platform: string;
}

const api: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,
};

contextBridge.exposeInMainWorld('electronAPI', api);
