export const EMBEDDING_MODEL = "voyage-multimodal-3.5";
export const EMBEDDING_DIMENSIONS = 1024;
export const INDEX_VERSION = 1;
export const PAGE_RENDERER_VERSION = "page-renderer-v1";
export const PAGE_LONGEST_SIDE = 1600;
export const PAGE_JPEG_QUALITY = 85;
export const PDF_INDEX_CONCURRENCY = 1;
export const PAGE_EMBEDDING_BATCH_SIZE = 4;

export type PdfIndexStatus =
  | "not-indexed"
  | "waiting-for-api-key"
  | "queued"
  | "indexing"
  | "ready"
  | "failed"
  | "cancelled"
  | "stale"
  | "missing";

export type IndexingErrorCode =
  | "missing-api-key"
  | "invalid-api-key"
  | "secure-storage-unavailable"
  | "pdf-not-found"
  | "pdf-open-failed"
  | "page-render-failed"
  | "image-encode-failed"
  | "voyage-rate-limited"
  | "voyage-network-error"
  | "voyage-provider-error"
  | "invalid-embedding"
  | "storage-error"
  | "cancelled";

export interface PdfFingerprint {
  canonicalPath: string;
  fileSize: number;
  modifiedAtMs: number;
}

export interface IndexedPdfRecord {
  documentId: string;
  pdfPath: string;
  canonicalPath: string;
  fileSize: number;
  modifiedAtMs: number;
  pageCount: number | null;
  indexedPageCount: number;
  model: string;
  dimensions: number;
  rendererVersion: string;
  indexVersion: number;
  status: PdfIndexStatus;
  errorCode: IndexingErrorCode | string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageEmbeddingRecord {
  documentId: string;
  pageNumber: number;
  embedding: number[];
}

export interface PdfIndexProgress {
  documentId: string;
  pdfPath: string;
  status: PdfIndexStatus;
  pageCount: number | null;
  indexedPageCount: number;
  errorMessage: string | null;
}
