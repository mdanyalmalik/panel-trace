import type { PdfIndexProgress } from "./indexing";
import type {
  EvidenceViewerState,
  OpenEvidenceRequest,
  RetrievalRequest,
  RetrievalResponse
} from "./retrieval";
import type { VoyageConnectionTestResult, VoyageKeyStatus } from "./voyage";

export interface PdfFile {
  name: string;
  path: string;
}

export interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  getFolders: () => Promise<string[]>;
  addFolder: (folderPath: string) => Promise<string[]>;
  removeFolder: (folderPath: string) => Promise<string[]>;
  listPdfs: (folderPath: string) => Promise<PdfFile[]>;
  openPdf: (pdfPath: string) => Promise<ArrayBuffer>;
  getVoyageKeyStatus: () => Promise<VoyageKeyStatus>;
  saveVoyageApiKey: (apiKey: string) => Promise<VoyageKeyStatus>;
  removeVoyageApiKey: () => Promise<VoyageKeyStatus>;
  testVoyageConnection: (apiKey?: string) => Promise<VoyageConnectionTestResult>;
  getPdfIndexStatus: (pdfPath: string) => Promise<PdfIndexProgress>;
  getPdfIndexStatuses: (folderPath: string) => Promise<PdfIndexProgress[]>;
  retryPdfIndex: (pdfPath: string) => Promise<void>;
  onPdfIndexProgress: (callback: (progress: PdfIndexProgress) => void) => () => void;
  searchEarlierPages: (request: RetrievalRequest) => Promise<RetrievalResponse>;
  openEvidenceViewer: (request: OpenEvidenceRequest) => Promise<void>;
  getEvidenceViewerState: () => Promise<EvidenceViewerState | null>;
  exitApp: () => void;
}
