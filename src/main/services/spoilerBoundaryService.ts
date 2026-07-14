import path from "node:path";

import { listPdfs } from "../pdfLibrary";
import type { PdfFile } from "../../shared/electronApi";
import type { OpenEvidenceRequest } from "../../shared/retrieval";

interface SpoilerBoundary {
  sortedPdfs: PdfFile[];
  currentPdf: PdfFile;
  currentPdfIndex: number;
  earlierPdfPaths: Set<string>;
}

const normalizePath = (filePath: string): string => path.normalize(filePath);

export const getSpoilerBoundary = async (
  userDataPath: string,
  folderPath: string,
  currentPdfPath: string
): Promise<SpoilerBoundary | null> => {
  const sortedPdfs = await listPdfs(userDataPath, folderPath);
  const normalizedCurrentPdfPath = normalizePath(currentPdfPath);
  const currentPdfIndex = sortedPdfs.findIndex(
    (pdf) => normalizePath(pdf.path) === normalizedCurrentPdfPath
  );

  if (currentPdfIndex < 0) {
    return null;
  }

  return {
    sortedPdfs,
    currentPdf: sortedPdfs[currentPdfIndex],
    currentPdfIndex,
    earlierPdfPaths: new Set(
      sortedPdfs.slice(0, currentPdfIndex).map((pdf) => normalizePath(pdf.path))
    )
  };
};

export const isEligiblePage = (
  candidatePdfPath: string,
  candidatePageNumber: number,
  currentPdfPath: string,
  currentPage: number,
  earlierPdfPaths: Set<string>
): boolean => {
  const normalizedCandidatePdfPath = normalizePath(candidatePdfPath);
  const normalizedCurrentPdfPath = normalizePath(currentPdfPath);

  if (normalizedCandidatePdfPath === normalizedCurrentPdfPath) {
    return candidatePageNumber < currentPage;
  }

  return earlierPdfPaths.has(normalizedCandidatePdfPath);
};

export const validateEvidenceRequest = async (
  userDataPath: string,
  request: OpenEvidenceRequest
): Promise<PdfFile | null> => {
  const boundary = await getSpoilerBoundary(
    userDataPath,
    request.sourceFolderPath,
    request.sourcePdfPath
  );

  if (!boundary) {
    return null;
  }

  const normalizedTargetPath = normalizePath(request.targetPdfPath);
  const targetPdf = boundary.sortedPdfs.find(
    (pdf) => normalizePath(pdf.path) === normalizedTargetPath
  );

  if (!targetPdf || request.targetPage < 1) {
    return null;
  }

  if (
    !isEligiblePage(
      targetPdf.path,
      request.targetPage,
      request.sourcePdfPath,
      request.sourceCurrentPage,
      boundary.earlierPdfPaths
    )
  ) {
    return null;
  }

  return targetPdf;
};
