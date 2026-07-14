import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { addFolder, getFolders, removeFolder } from "./libraryStore";
import { listPdfs, openPdf } from "./pdfLibrary";
import { EvidenceWindowService } from "./services/evidenceWindowService";
import { FolderIndexingService } from "./services/folderIndexingService";
import { IndexingQueue } from "./services/indexingQueue";
import { getProgressForPdfs } from "./services/pageIndexStore";
import { PdfPageRenderer } from "./services/pdfPageRenderer";
import { searchEarlierPages } from "./services/retrievalService";
import {
  getVoyageKeyStatus,
  removeVoyageApiKey,
  saveVoyageApiKey
} from "./services/secureCredentialStore";
import { testVoyageConnection } from "./services/voyageEmbeddingService";
import type { OpenEvidenceRequest, RetrievalRequest } from "../shared/retrieval";

let indexingQueue: IndexingQueue | null = null;
let folderIndexingService: FolderIndexingService | null = null;
let evidenceWindowService: EvidenceWindowService | null = null;
const mainDirectory = path.dirname(fileURLToPath(import.meta.url));

const startFolderIndexing = (folderPath: string): void => {
  void folderIndexingService?.discoverAndQueueFolder(folderPath).catch((error: unknown) => {
    console.error("Unable to queue folder for indexing:", error);
  });
};

const startSavedFolderIndexing = (): void => {
  void folderIndexingService?.discoverAndQueueSavedFolders().catch((error: unknown) => {
    console.error("Unable to queue saved folders for indexing:", error);
  });
};

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: "#27272a",
    webPreferences: {
      preload: path.join(mainDirectory, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(mainDirectory, "../renderer/index.html"));
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

  ipcMain.handle("library:add-folder", async (_event, folderPath: string) => {
    const folders = await addFolder(app.getPath("userData"), folderPath);
    startFolderIndexing(folderPath);
    return folders;
  });

  ipcMain.handle("library:remove-folder", async (_event, folderPath: string) => {
    folderIndexingService?.cancelFolder(folderPath);
    return removeFolder(app.getPath("userData"), folderPath);
  });

  ipcMain.handle("library:list-pdfs", (_event, folderPath: string) =>
    listPdfs(app.getPath("userData"), folderPath)
  );

  ipcMain.handle("library:open-pdf", (_event, pdfPath: string) =>
    openPdf(app.getPath("userData"), pdfPath)
  );

  ipcMain.handle("settings:voyage-key-status", () =>
    getVoyageKeyStatus(app.getPath("userData"))
  );

  ipcMain.handle("settings:save-voyage-api-key", async (_event, apiKey: string) => {
    const status = await saveVoyageApiKey(app.getPath("userData"), apiKey);
    void indexingQueue?.queueWaitingDocuments();
    return status;
  });

  ipcMain.handle("settings:remove-voyage-api-key", async () => {
    const status = await removeVoyageApiKey(app.getPath("userData"));
    await indexingQueue?.pauseForMissingKey();
    return status;
  });

  ipcMain.handle("settings:test-voyage-connection", (_event, apiKey?: string) =>
    testVoyageConnection(app.getPath("userData"), apiKey)
  );

  ipcMain.handle("indexing:get-pdf-statuses", (_event, folderPath: string) =>
    folderIndexingService?.getFolderStatuses(folderPath) ?? []
  );

  ipcMain.handle("indexing:get-pdf-status", async (_event, pdfPath: string) => {
    const statuses = await getProgressForPdfs(app.getPath("userData"), [pdfPath]);
    return statuses[0];
  });

  ipcMain.handle("indexing:retry-pdf", (_event, pdfPath: string) =>
    folderIndexingService?.retryPdf(pdfPath)
  );

  ipcMain.handle("retrieval:search-earlier-pages", (_event, request: RetrievalRequest) =>
    searchEarlierPages(app.getPath("userData"), request)
  );

  ipcMain.handle("evidence:open-viewer", (_event, request: OpenEvidenceRequest) =>
    evidenceWindowService?.openEvidence(request)
  );

  ipcMain.handle("evidence:get-state", () => evidenceWindowService?.getState() ?? null);

  ipcMain.on("app:exit", () => {
    app.quit();
  });
};

app.whenReady().then(() => {
  indexingQueue = new IndexingQueue(app.getPath("userData"), new PdfPageRenderer());
  folderIndexingService = new FolderIndexingService(
    app.getPath("userData"),
    indexingQueue
  );
  evidenceWindowService = new EvidenceWindowService(app.getPath("userData"), mainDirectory);
  registerIpcHandlers();
  createWindow();
  startSavedFolderIndexing();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  indexingQueue?.destroy();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
