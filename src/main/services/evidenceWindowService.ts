import { BrowserWindow } from "electron";
import path from "node:path";

import type {
  EvidenceViewerState,
  OpenEvidenceRequest
} from "../../shared/retrieval";
import { getReadyDocumentByPath } from "./pageIndexStore";
import { validateEvidenceRequest } from "./spoilerBoundaryService";

export class EvidenceWindowService {
  private userDataPath: string;
  private mainDirectory: string;
  private evidenceWindow: BrowserWindow | null = null;
  private state: EvidenceViewerState | null = null;

  constructor(userDataPath: string, mainDirectory: string) {
    this.userDataPath = userDataPath;
    this.mainDirectory = mainDirectory;
  }

  getState(): EvidenceViewerState | null {
    return this.state;
  }

  async openEvidence(request: OpenEvidenceRequest): Promise<void> {
    const targetPdf = await validateEvidenceRequest(this.userDataPath, request);

    if (!targetPdf) {
      throw new Error("Evidence request is outside the spoiler boundary.");
    }

    const readyRecord = await getReadyDocumentByPath(this.userDataPath, targetPdf.path);

    if (
      !readyRecord ||
      !readyRecord.pageCount ||
      request.targetPage > readyRecord.pageCount
    ) {
      throw new Error("Evidence target is not ready.");
    }

    this.state = {
      pdfPath: targetPdf.path,
      pdfName: targetPdf.name,
      initialPage: request.targetPage
    };

    if (!this.evidenceWindow || this.evidenceWindow.isDestroyed()) {
      this.evidenceWindow = new BrowserWindow({
        width: 900,
        height: 1000,
        minWidth: 520,
        minHeight: 640,
        backgroundColor: "#27272a",
        title: `Panel Trace Evidence - ${targetPdf.name} - Page ${request.targetPage}`,
        webPreferences: {
          preload: path.join(this.mainDirectory, "../preload/preload.mjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false
        }
      });

      this.evidenceWindow.on("closed", () => {
        this.evidenceWindow = null;
      });
    } else {
      this.evidenceWindow.setTitle(
        `Panel Trace Evidence - ${targetPdf.name} - Page ${request.targetPage}`
      );
      this.evidenceWindow.focus();
    }

    if (process.env.ELECTRON_RENDERER_URL) {
      await this.evidenceWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#evidence`);
      return;
    }

    await this.evidenceWindow.loadFile(
      path.join(this.mainDirectory, "../renderer/index.html"),
      { hash: "evidence" }
    );
  }
}
