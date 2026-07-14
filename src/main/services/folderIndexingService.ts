import { BrowserWindow } from "electron";

import { getFolders } from "../libraryStore";
import { listPdfs } from "../pdfLibrary";
import { getProgressForPdfs, markMissingPdfs, toProgress } from "./pageIndexStore";
import { IndexingQueue } from "./indexingQueue";
import type { PdfIndexProgress } from "../../shared/indexing";

export class FolderIndexingService {
  private userDataPath: string;
  private queue: IndexingQueue;

  constructor(userDataPath: string, queue: IndexingQueue) {
    this.userDataPath = userDataPath;
    this.queue = queue;
  }

  async discoverAndQueueFolder(folderPath: string): Promise<void> {
    const pdfs = await listPdfs(this.userDataPath, folderPath);

    for (const pdf of pdfs) {
      await this.queue.queuePdf(pdf.path);
    }
  }

  async discoverAndQueueSavedFolders(): Promise<void> {
    const folders = await getFolders(this.userDataPath);
    const allPdfPaths: string[] = [];

    for (const folderPath of folders) {
      const pdfs = await listPdfs(this.userDataPath, folderPath);
      allPdfPaths.push(...pdfs.map((pdf) => pdf.path));

      for (const pdf of pdfs) {
        await this.queue.queuePdf(pdf.path);
      }
    }

    const changedRecords = await markMissingPdfs(this.userDataPath, allPdfPaths);
    for (const record of changedRecords) {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send("indexing:progress", toProgress(record));
      }
    }
  }

  async getFolderStatuses(folderPath: string): Promise<PdfIndexProgress[]> {
    const pdfs = await listPdfs(this.userDataPath, folderPath);
    return getProgressForPdfs(
      this.userDataPath,
      pdfs.map((pdf) => pdf.path)
    );
  }

  async retryPdf(pdfPath: string): Promise<void> {
    await this.queue.queuePdf(pdfPath);
  }

  cancelFolder(folderPath: string): void {
    this.queue.cancelFolder(folderPath);
  }
}
