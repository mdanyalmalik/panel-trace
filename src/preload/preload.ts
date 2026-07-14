import { contextBridge, ipcRenderer } from "electron";

import type { ElectronAPI } from "../shared/electronApi";

const electronAPI: ElectronAPI = {
  selectFolder: () => ipcRenderer.invoke("library:select-folder"),
  getFolders: () => ipcRenderer.invoke("library:get-folders"),
  addFolder: (folderPath) => ipcRenderer.invoke("library:add-folder", folderPath),
  removeFolder: (folderPath) => ipcRenderer.invoke("library:remove-folder", folderPath),
  listPdfs: (folderPath) => ipcRenderer.invoke("library:list-pdfs", folderPath),
  openPdf: (pdfPath) => ipcRenderer.invoke("library:open-pdf", pdfPath),
  getVoyageKeyStatus: () => ipcRenderer.invoke("settings:voyage-key-status"),
  saveVoyageApiKey: (apiKey) =>
    ipcRenderer.invoke("settings:save-voyage-api-key", apiKey),
  removeVoyageApiKey: () => ipcRenderer.invoke("settings:remove-voyage-api-key"),
  testVoyageConnection: (apiKey) =>
    ipcRenderer.invoke("settings:test-voyage-connection", apiKey),
  getPdfIndexStatus: (pdfPath) => ipcRenderer.invoke("indexing:get-pdf-status", pdfPath),
  getPdfIndexStatuses: (folderPath) =>
    ipcRenderer.invoke("indexing:get-pdf-statuses", folderPath),
  retryPdfIndex: (pdfPath) => ipcRenderer.invoke("indexing:retry-pdf", pdfPath),
  onPdfIndexProgress: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: Parameters<typeof callback>[0]) => {
      callback(progress);
    };

    ipcRenderer.on("indexing:progress", listener);

    return () => {
      ipcRenderer.removeListener("indexing:progress", listener);
    };
  },
  exitApp: () => {
    ipcRenderer.send("app:exit");
  }
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
