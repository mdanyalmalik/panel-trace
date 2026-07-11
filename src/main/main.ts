import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";

import { addFolder, getFolders, removeFolder } from "./libraryStore";
import { listPdfs, openPdf } from "./pdfLibrary";

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: "#8f8f8f",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
};

const registerIpcHandlers = (): void => {
  ipcMain.handle("library:select-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle("library:get-folders", () => getFolders(app.getPath("userData")));

  ipcMain.handle("library:add-folder", (_event, folderPath: string) =>
    addFolder(app.getPath("userData"), folderPath)
  );

  ipcMain.handle("library:remove-folder", (_event, folderPath: string) =>
    removeFolder(app.getPath("userData"), folderPath)
  );

  ipcMain.handle("library:list-pdfs", (_event, folderPath: string) =>
    listPdfs(app.getPath("userData"), folderPath)
  );

  ipcMain.handle("library:open-pdf", (_event, pdfPath: string) =>
    openPdf(app.getPath("userData"), pdfPath)
  );

  ipcMain.on("app:exit", () => {
    app.quit();
  });
};

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
