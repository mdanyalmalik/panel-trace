import { BrowserWindow } from "electron";
import path from "node:path";

import {
  getVoyageKeyStatus
} from "./secureCredentialStore";
import { embedPageImage, VoyageEmbeddingError } from "./voyageEmbeddingService";
import { PdfPageRenderer } from "./pdfPageRenderer";
import {
  createOrReuseQueuedRecord,
  getErrorUpdate,
  getLatestRecordForPdf,
  getWaitingDocuments,
  isReadyRecordUnchanged,
  removeDocumentEmbeddings,
  savePageEmbedding,
  setQueuedDocumentsWaitingForKey,
  toProgress,
  updateDocumentStatus,
  getPdfFingerprint
} from "./pageIndexStore";
import type { IndexedPdfRecord, IndexingErrorCode, PdfIndexProgress } from "../../shared/indexing";

interface IndexingJob {
  pdfPath: string;
  documentId: string;
}

const normalizePath = (filePath: string): string => path.normalize(filePath);

export class IndexingQueue {
  private userDataPath: string;
  private pageRenderer: PdfPageRenderer;
  private jobs: IndexingJob[] = [];
  private queuedPaths = new Set<string>();
  private runningJob: IndexingJob | null = null;
  private cancelledDocumentIds = new Set<string>();
  private isProcessing = false;

  constructor(userDataPath: string, pageRenderer: PdfPageRenderer) {
    this.userDataPath = userDataPath;
    this.pageRenderer = pageRenderer;
  }

  private broadcastProgress(progress: PdfIndexProgress): void {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send("indexing:progress", progress);
    }
  }

  private async updateAndBroadcast(
    documentId: string,
    updates: Parameters<typeof updateDocumentStatus>[2]
  ): Promise<IndexedPdfRecord | null> {
    const record = await updateDocumentStatus(this.userDataPath, documentId, updates);

    if (record) {
      this.broadcastProgress(toProgress(record));
    }

    return record;
  }

  async queuePdf(pdfPath: string): Promise<void> {
    const normalizedPdfPath = normalizePath(pdfPath);

    if (
      this.queuedPaths.has(normalizedPdfPath) ||
      normalizePath(this.runningJob?.pdfPath ?? "") === normalizedPdfPath
    ) {
      return;
    }

    const fingerprint = await getPdfFingerprint(normalizedPdfPath);
    const latestRecord = await getLatestRecordForPdf(this.userDataPath, normalizedPdfPath);

    if (latestRecord && isReadyRecordUnchanged(latestRecord, fingerprint)) {
      this.broadcastProgress(toProgress(latestRecord));
      return;
    }

    const keyStatus = await getVoyageKeyStatus(this.userDataPath);
    const status = keyStatus.configured ? "queued" : "waiting-for-api-key";
    const record = await createOrReuseQueuedRecord(this.userDataPath, normalizedPdfPath, status);
    this.broadcastProgress(toProgress(record));

    if (!keyStatus.configured) {
      return;
    }

    this.jobs.push({ pdfPath: normalizedPdfPath, documentId: record.documentId });
    this.queuedPaths.add(normalizedPdfPath);
    void this.processNext();
  }

  async queueWaitingDocuments(): Promise<void> {
    const waitingDocuments = await getWaitingDocuments(this.userDataPath);

    for (const document of waitingDocuments) {
      await this.queuePdf(document.pdfPath);
    }
  }

  async pauseForMissingKey(): Promise<void> {
    this.jobs = [];
    this.queuedPaths.clear();
    const waitingRecords = await setQueuedDocumentsWaitingForKey(this.userDataPath);

    for (const record of waitingRecords) {
      this.broadcastProgress(toProgress(record));
    }
  }

  cancelFolder(folderPath: string): void {
    const normalizedFolderPath = normalizePath(folderPath);
    const isInFolder = (pdfPath: string): boolean =>
      normalizePath(path.dirname(pdfPath)) === normalizedFolderPath;

    this.jobs = this.jobs.filter((job) => {
      if (isInFolder(job.pdfPath)) {
        this.queuedPaths.delete(normalizePath(job.pdfPath));
        this.cancelledDocumentIds.add(job.documentId);
        return false;
      }

      return true;
    });

    if (this.runningJob && isInFolder(this.runningJob.pdfPath)) {
      this.cancelledDocumentIds.add(this.runningJob.documentId);
    }
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.jobs.length > 0) {
        const nextJob = this.jobs.shift();

        if (!nextJob) {
          continue;
        }

        this.queuedPaths.delete(normalizePath(nextJob.pdfPath));
        this.runningJob = nextJob;

        try {
          await this.indexPdf(nextJob);
        } finally {
          this.runningJob = null;
          this.cancelledDocumentIds.delete(nextJob.documentId);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private assertNotCancelled(documentId: string): void {
    if (this.cancelledDocumentIds.has(documentId)) {
      throw new VoyageEmbeddingError("cancelled", "Indexing was cancelled.");
    }
  }

  private async indexPdf(job: IndexingJob): Promise<void> {
    const keyStatus = await getVoyageKeyStatus(this.userDataPath);

    if (!keyStatus.configured) {
      await this.updateAndBroadcast(job.documentId, {
        status: "waiting-for-api-key",
        errorCode: null,
        errorMessage: null
      });
      return;
    }

    try {
      this.assertNotCancelled(job.documentId);
      await removeDocumentEmbeddings(this.userDataPath, job.documentId);
      await this.updateAndBroadcast(job.documentId, {
        status: "indexing",
        indexedPageCount: 0,
        errorCode: null,
        errorMessage: null
      });

      const pageCount = await this.pageRenderer.getPageCount(job.pdfPath);
      await this.updateAndBroadcast(job.documentId, { pageCount });

      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        this.assertNotCancelled(job.documentId);
        const pageImage = await this.pageRenderer.renderPageImage(job.pdfPath, pageNumber);
        const embeddingResult = await embedPageImage(this.userDataPath, pageImage.imageDataUrl);

        await savePageEmbedding(this.userDataPath, {
          documentId: job.documentId,
          pageNumber,
          embedding: embeddingResult.embedding
        });
        await this.updateAndBroadcast(job.documentId, {
          pageCount,
          indexedPageCount: pageNumber
        });
      }

      await this.updateAndBroadcast(job.documentId, {
        status: "ready",
        pageCount,
        indexedPageCount: pageCount,
        errorCode: null,
        errorMessage: null
      });
    } catch (error) {
      const indexError = error as Error;
      const errorCode: IndexingErrorCode =
        error instanceof VoyageEmbeddingError ? error.code : "storage-error";
      const errorMessage =
        error instanceof VoyageEmbeddingError
          ? error.message
          : indexError.message || "Indexing failed. Retry?";

      if (errorCode === "missing-api-key" || errorCode === "invalid-api-key") {
        await this.pauseForMissingKey();
      }

      const record = await this.updateAndBroadcast(
        job.documentId,
        getErrorUpdate(errorCode, errorMessage)
      );

      if (record) {
        console.error("Indexing failed:", {
          documentId: record.documentId,
          pdfPath: record.pdfPath,
          errorCode
        });
      }
    }
  }

  destroy(): void {
    this.jobs = [];
    this.queuedPaths.clear();
    this.pageRenderer.destroy();
  }
}
