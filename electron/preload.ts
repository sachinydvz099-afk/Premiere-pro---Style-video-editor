import { contextBridge, ipcRenderer } from 'electron';

export interface ReacutDesktopApi {
  openFileDialog: (options?: Electron.OpenDialogOptions) => Promise<string[] | null>;
  saveFileDialog: (options?: Electron.SaveDialogOptions) => Promise<string | null>;
  probeMedia: (filePath: string) => Promise<unknown>;
  startFFmpegExport: (args: string[]) => Promise<boolean>;
  cancelExport: () => Promise<boolean>;
  onExportProgress: (callback: (progress: unknown) => void) => () => void;
}

const api: ReacutDesktopApi = {
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  probeMedia: (filePath) => ipcRenderer.invoke('media:probe', filePath),
  startFFmpegExport: (args) => ipcRenderer.invoke('export:render', args),
  cancelExport: () => ipcRenderer.invoke('export:cancel'),
  onExportProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: unknown) => callback(progress);
    ipcRenderer.on('export:progress', handler);
    return () => {
      ipcRenderer.removeListener('export:progress', handler);
    };
  }
};

contextBridge.exposeInMainWorld('reacutApi', api);

