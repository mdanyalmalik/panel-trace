import { contextBridge, ipcRenderer } from "electron";

import type { ElectronAPI } from "../shared/electronApi";

const electronAPI: ElectronAPI = {
  selectFolder: () => ipcRenderer.invoke("library:select-folder"),
  getFolders: () => ipcRenderer.invoke("library:get-folders"),
  addFolder: (folderPath) => ipcRenderer.invoke("library:add-folder", folderPath),
  removeFolder: (folderPath) => ipcRenderer.invoke("library:remove-folder", folderPath),
  listPdfs: (folderPath) => ipcRenderer.invoke("library:list-pdfs", folderPath),
  openPdf: (pdfPath) => ipcRenderer.invoke("library:open-pdf", pdfPath),
  exitApp: () => {
    ipcRenderer.send("app:exit");
  }
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
