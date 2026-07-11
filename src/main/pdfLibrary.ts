import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { getFolders } from "./libraryStore";
import type { PdfFile } from "../shared/electronApi";

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base"
});

const normalizePath = (filePath: string): string => path.normalize(filePath);

const isPdfFile = (fileName: string): boolean => path.extname(fileName).toLowerCase() === ".pdf";

const getSavedFolders = async (userDataPath: string): Promise<string[]> =>
  (await getFolders(userDataPath)).map(normalizePath);

const isSavedFolder = async (userDataPath: string, folderPath: string): Promise<boolean> => {
  const savedFolders = await getSavedFolders(userDataPath);
  return savedFolders.includes(normalizePath(folderPath));
};

const findOwningSavedFolder = async (
  userDataPath: string,
  pdfPath: string
): Promise<string | null> => {
  const normalizedPdfPath = normalizePath(pdfPath);
  const pdfFolderPath = normalizePath(path.dirname(normalizedPdfPath));
  const savedFolders = await getSavedFolders(userDataPath);

  return savedFolders.find((folderPath) => folderPath === pdfFolderPath) ?? null;
};

export const listPdfs = async (
  userDataPath: string,
  folderPath: string
): Promise<PdfFile[]> => {
  if (!(await isSavedFolder(userDataPath, folderPath))) {
    return [];
  }

  const normalizedFolderPath = normalizePath(folderPath);
  const entries = await readdir(normalizedFolderPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && isPdfFile(entry.name))
    .map((entry) => ({
      name: entry.name,
      path: path.join(normalizedFolderPath, entry.name)
    }))
    .sort((firstPdf, secondPdf) => collator.compare(firstPdf.name, secondPdf.name));
};

export const openPdf = async (
  userDataPath: string,
  pdfPath: string
): Promise<ArrayBuffer> => {
  const owningFolder = await findOwningSavedFolder(userDataPath, pdfPath);

  if (!owningFolder || !isPdfFile(pdfPath)) {
    throw new Error("PDF is not inside a saved library folder.");
  }

  const normalizedPdfPath = normalizePath(pdfPath);
  const buffer = await readFile(normalizedPdfPath);

  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
};
