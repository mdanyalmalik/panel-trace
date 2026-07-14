import path from "node:path";

import { EMBEDDING_DIMENSIONS } from "../../shared/indexing";
import {
  CURRENT_PAGE_WEIGHT,
  MIN_PAGE_DISTANCE_FOR_SAME_PDF,
  QUERY_WEIGHT,
  RETRIEVAL_LIMIT
} from "../../shared/retrieval";
import type { IndexedPdfRecord, PageEmbeddingRecord } from "../../shared/indexing";
import type {
  RetrievalRequest,
  RetrievalResponse,
  RetrievalResult
} from "../../shared/retrieval";
import { embedQueryText, VoyageEmbeddingError } from "./voyageEmbeddingService";
import {
  getPageEmbedding,
  getReadyDocumentByPath,
  getReadyPageEmbeddingsForDocuments
} from "./pageIndexStore";
import { getSpoilerBoundary, isEligiblePage } from "./spoilerBoundaryService";

interface Candidate {
  record: IndexedPdfRecord;
  page: PageEmbeddingRecord;
  pdfName: string;
}

const normalizePath = (filePath: string): string => path.normalize(filePath);

const vectorMagnitude = (vector: number[]): number =>
  Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

const normalizeVector = (vector: number[]): number[] => {
  const magnitude = vectorMagnitude(vector);

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
};

const dotProduct = (firstVector: number[], secondVector: number[]): number =>
  firstVector.reduce((sum, value, index) => sum + value * secondVector[index], 0);

const blendVectors = (queryEmbedding: number[], currentPageEmbedding: number[] | null): number[] => {
  const normalizedQuery = normalizeVector(queryEmbedding);

  if (!currentPageEmbedding) {
    return normalizedQuery;
  }

  const normalizedCurrentPage = normalizeVector(currentPageEmbedding);
  return normalizeVector(
    normalizedQuery.map(
      (value, index) =>
        QUERY_WEIGHT * value + CURRENT_PAGE_WEIGHT * normalizedCurrentPage[index]
    )
  );
};

const applyDiversity = (results: RetrievalResult[], limit: number): RetrievalResult[] => {
  const keptResults: RetrievalResult[] = [];

  for (const result of results) {
    const closePageCount = keptResults.filter(
      (keptResult) =>
        keptResult.pdfPath === result.pdfPath &&
        Math.abs(keptResult.pageNumber - result.pageNumber) < MIN_PAGE_DISTANCE_FOR_SAME_PDF
    ).length;

    if (closePageCount >= 2) {
      continue;
    }

    keptResults.push(result);

    if (keptResults.length >= limit) {
      return keptResults;
    }
  }

  return keptResults;
};

export const searchEarlierPages = async (
  userDataPath: string,
  request: RetrievalRequest
): Promise<RetrievalResponse> => {
  const startedAt = performance.now();
  const query = request.query.trim();

  if (!query) {
    return {
      results: [],
      status: "no-results",
      message: "Ask a question to search earlier pages."
    };
  }

  const boundary = await getSpoilerBoundary(
    userDataPath,
    request.folderPath,
    request.currentPdfPath
  );

  if (!boundary) {
    return {
      results: [],
      status: "index-unavailable",
      message: "This document is not available in the current folder."
    };
  }

  if (boundary.currentPdfIndex === 0 && request.currentPage <= 1) {
    return {
      results: [],
      status: "no-results",
      message: "There is no earlier content to search."
    };
  }

  try {
    const queryStartedAt = performance.now();
    const queryEmbedding = (await embedQueryText(userDataPath, query)).embedding;
    const queryDuration = performance.now() - queryStartedAt;

    const readyRecords = (
      await Promise.all(
        boundary.sortedPdfs.map((pdf) => getReadyDocumentByPath(userDataPath, pdf.path))
      )
    ).filter((record): record is IndexedPdfRecord => record !== null);
    const readyRecordsByPath = new Map(
      readyRecords.map((record) => [normalizePath(record.pdfPath), record])
    );
    const currentReadyRecord = readyRecordsByPath.get(
      normalizePath(request.currentPdfPath)
    );
    const currentPageEmbedding = currentReadyRecord
      ? await getPageEmbedding(
          userDataPath,
          currentReadyRecord.documentId,
          request.currentPage
        )
      : null;

    if (!currentPageEmbedding) {
      console.debug("Current page embedding unavailable; using text-only retrieval.", {
        currentPdfPath: request.currentPdfPath,
        currentPage: request.currentPage
      });
    }

    const combinedQuery = blendVectors(
      queryEmbedding,
      currentPageEmbedding?.embedding ?? null
    );
    const eligibleRecords = readyRecords.filter((record) => {
      if (normalizePath(record.pdfPath) === normalizePath(request.currentPdfPath)) {
        return true;
      }

      return boundary.earlierPdfPaths.has(normalizePath(record.pdfPath));
    });

    const candidatesStartedAt = performance.now();
    const pageEmbeddings = await getReadyPageEmbeddingsForDocuments(
      userDataPath,
      eligibleRecords.map((record) => record.documentId)
    );
    const recordsByDocumentId = new Map(
      eligibleRecords.map((record) => [record.documentId, record])
    );
    const pdfNamesByPath = new Map(boundary.sortedPdfs.map((pdf) => [normalizePath(pdf.path), pdf.name]));
    const candidates: Candidate[] = pageEmbeddings
      .map((page) => {
        const record = recordsByDocumentId.get(page.documentId);

        if (!record) {
          return null;
        }

        return {
          record,
          page,
          pdfName: pdfNamesByPath.get(normalizePath(record.pdfPath)) ?? path.basename(record.pdfPath)
        };
      })
      .filter((candidate): candidate is Candidate => {
        if (!candidate) {
          return false;
        }

        return isEligiblePage(
          candidate.record.pdfPath,
          candidate.page.pageNumber,
          request.currentPdfPath,
          request.currentPage,
          boundary.earlierPdfPaths
        );
      });
    const candidateDuration = performance.now() - candidatesStartedAt;

    if (candidates.length === 0) {
      const hasCurrentRecord = Boolean(currentReadyRecord);
      return {
        results: [],
        status: hasCurrentRecord ? "no-results" : "current-pdf-not-indexed",
        message: hasCurrentRecord
          ? "No earlier indexed pages are available yet."
          : "This document is not ready for search yet."
      };
    }

    const similarityStartedAt = performance.now();
    const rankedResults = candidates
      .filter((candidate) => candidate.page.embedding.length === EMBEDDING_DIMENSIONS)
      .map((candidate) => ({
        id: `${candidate.record.documentId}:${candidate.page.pageNumber}`,
        pdfPath: candidate.record.pdfPath,
        pdfName: candidate.pdfName,
        pageNumber: candidate.page.pageNumber,
        score: dotProduct(combinedQuery, normalizeVector(candidate.page.embedding))
      }))
      .sort((firstResult, secondResult) => secondResult.score - firstResult.score);
    const results = applyDiversity(
      rankedResults,
      request.limit ?? RETRIEVAL_LIMIT
    );
    const similarityDuration = performance.now() - similarityStartedAt;

    console.debug("Retrieval completed.", {
      queryEmbeddingDurationMs: Math.round(queryDuration),
      candidateLoadingDurationMs: Math.round(candidateDuration),
      similaritySearchDurationMs: Math.round(similarityDuration),
      candidateCount: candidates.length,
      resultCount: results.length,
      totalDurationMs: Math.round(performance.now() - startedAt)
    });

    if (results.length === 0) {
      return {
        results: [],
        status: "no-results",
        message: "No earlier indexed pages are available yet."
      };
    }

    return {
      results,
      status: "success"
    };
  } catch (error) {
    if (error instanceof VoyageEmbeddingError) {
      if (error.code === "missing-api-key") {
        return {
          results: [],
          status: "missing-api-key",
          message: "Add a Voyage API key in Settings to search."
        };
      }

      return {
        results: [],
        status: "error",
        message: error.message || "Search failed."
      };
    }

    console.error("Retrieval failed:", error);
    return {
      results: [],
      status: "error",
      message: "Search failed."
    };
  }
};
