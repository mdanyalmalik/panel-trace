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
  exitApp: () => void;
}
