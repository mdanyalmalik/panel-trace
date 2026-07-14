export const RETRIEVAL_LIMIT = 5;
export const QUERY_WEIGHT = 0.7;
export const CURRENT_PAGE_WEIGHT = 0.3;
export const MIN_PAGE_DISTANCE_FOR_SAME_PDF = 3;
export const RETRIEVAL_VERSION = 1;

export interface RetrievalRequest {
  folderPath: string;
  currentPdfPath: string;
  currentPage: number;
  query: string;
  limit?: number;
}

export interface RetrievalResult {
  id: string;
  pdfPath: string;
  pdfName: string;
  pageNumber: number;
  score: number;
}

export type RetrievalStatus =
  | "success"
  | "no-results"
  | "current-pdf-not-indexed"
  | "missing-api-key"
  | "index-unavailable"
  | "error";

export interface RetrievalResponse {
  results: RetrievalResult[];
  status: RetrievalStatus;
  message?: string;
}

export interface OpenEvidenceRequest {
  sourceFolderPath: string;
  sourcePdfPath: string;
  sourceCurrentPage: number;
  targetPdfPath: string;
  targetPage: number;
}

export interface EvidenceViewerState {
  pdfPath: string;
  pdfName: string;
  initialPage: number;
}
