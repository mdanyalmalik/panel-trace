import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  INDEX_VERSION,
  PAGE_RENDERER_VERSION
} from "../../shared/indexing";
import type {
  IndexedPdfRecord,
  IndexingErrorCode,
  PageEmbeddingRecord,
  PdfFingerprint,
  PdfIndexProgress,
  PdfIndexStatus
} from "../../shared/indexing";

interface StoredPageEmbeddingRecord {
  documentId: string;
  pageNumber: number;
  embeddingBase64: string;
}

interface IndexData {
  documents: IndexedPdfRecord[];
  pageEmbeddings: StoredPageEmbeddingRecord[];
}

const indexDirectoryName = "indexes";
const indexFileName = "page-index.json";

const getIndexFilePath = (userDataPath: string): string =>
  path.join(userDataPath, indexDirectoryName, indexFileName);

const emptyIndexData = (): IndexData => ({
  documents: [],
  pageEmbeddings: []
});

const nowIso = (): string => new Date().toISOString();

const normalizePath = (filePath: string): string => path.normalize(filePath);

const serializeEmbedding = (embedding: number[]): string => {
  const floatArray = Float32Array.from(embedding);
  return Buffer.from(floatArray.buffer).toString("base64");
};

const deserializeEmbedding = (embeddingBase64: string): number[] => {
  const buffer = Buffer.from(embeddingBase64, "base64");
  return Array.from(new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4));
};

const isIndexData = (value: unknown): value is IndexData => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeData = value as Partial<IndexData>;
  return Array.isArray(maybeData.documents) && Array.isArray(maybeData.pageEmbeddings);
};

const readIndexData = async (userDataPath: string): Promise<IndexData> => {
  try {
    const fileContents = await readFile(getIndexFilePath(userDataPath), "utf8");
    const parsedData: unknown = JSON.parse(fileContents);

    return isIndexData(parsedData) ? parsedData : emptyIndexData();
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") {
      console.error("Unable to read page index store:", error);
    }

    return emptyIndexData();
  }
};

const writeIndexData = async (userDataPath: string, data: IndexData): Promise<void> => {
  const indexFilePath = getIndexFilePath(userDataPath);
  await mkdir(path.dirname(indexFilePath), { recursive: true });
  await writeFile(indexFilePath, JSON.stringify(data, null, 2), "utf8");
};

export const getPdfFingerprint = async (pdfPath: string): Promise<PdfFingerprint> => {
  const normalizedPath = normalizePath(pdfPath);
  const fileStats = await stat(normalizedPath);

  return {
    canonicalPath: normalizedPath,
    fileSize: fileStats.size,
    modifiedAtMs: fileStats.mtimeMs
  };
};

export const isReadyRecordUnchanged = (
  record: IndexedPdfRecord,
  fingerprint: PdfFingerprint
): boolean =>
  record.canonicalPath === fingerprint.canonicalPath &&
  record.fileSize === fingerprint.fileSize &&
  record.modifiedAtMs === fingerprint.modifiedAtMs &&
  record.model === EMBEDDING_MODEL &&
  record.dimensions === EMBEDDING_DIMENSIONS &&
  record.rendererVersion === PAGE_RENDERER_VERSION &&
  record.indexVersion === INDEX_VERSION &&
  record.status === "ready";

export const getLatestRecordForPdf = async (
  userDataPath: string,
  pdfPath: string
): Promise<IndexedPdfRecord | null> => {
  const data = await readIndexData(userDataPath);
  const normalizedPdfPath = normalizePath(pdfPath);
  const records = data.documents
    .filter((record) => normalizePath(record.pdfPath) === normalizedPdfPath)
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

  return records[0] ?? null;
};

export const createOrReuseQueuedRecord = async (
  userDataPath: string,
  pdfPath: string,
  status: PdfIndexStatus
): Promise<IndexedPdfRecord> => {
  const fingerprint = await getPdfFingerprint(pdfPath);
  const data = await readIndexData(userDataPath);
  const existingRecord = data.documents.find(
    (record) =>
      record.canonicalPath === fingerprint.canonicalPath &&
      record.fileSize === fingerprint.fileSize &&
      record.modifiedAtMs === fingerprint.modifiedAtMs &&
      record.model === EMBEDDING_MODEL &&
      record.dimensions === EMBEDDING_DIMENSIONS &&
      record.rendererVersion === PAGE_RENDERER_VERSION &&
      record.indexVersion === INDEX_VERSION &&
      record.status !== "ready"
  );

  if (existingRecord) {
    existingRecord.status = status;
    existingRecord.errorCode = null;
    existingRecord.errorMessage = null;
    existingRecord.updatedAt = nowIso();
    await writeIndexData(userDataPath, data);
    return existingRecord;
  }

  for (const record of data.documents) {
    if (
      record.canonicalPath === fingerprint.canonicalPath &&
      !isReadyRecordUnchanged(record, fingerprint) &&
      record.status === "ready"
    ) {
      record.status = "stale";
      record.updatedAt = nowIso();
    }
  }

  const createdAt = nowIso();
  const record: IndexedPdfRecord = {
    documentId: randomUUID(),
    pdfPath: normalizePath(pdfPath),
    canonicalPath: fingerprint.canonicalPath,
    fileSize: fingerprint.fileSize,
    modifiedAtMs: fingerprint.modifiedAtMs,
    pageCount: null,
    indexedPageCount: 0,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    rendererVersion: PAGE_RENDERER_VERSION,
    indexVersion: INDEX_VERSION,
    status,
    errorCode: null,
    errorMessage: null,
    createdAt,
    updatedAt: createdAt
  };

  data.documents.push(record);
  await writeIndexData(userDataPath, data);
  return record;
};

export const updateDocumentStatus = async (
  userDataPath: string,
  documentId: string,
  updates: Partial<
    Pick<
      IndexedPdfRecord,
      "status" | "pageCount" | "indexedPageCount" | "errorCode" | "errorMessage"
    >
  >
): Promise<IndexedPdfRecord | null> => {
  const data = await readIndexData(userDataPath);
  const record = data.documents.find((document) => document.documentId === documentId);

  if (!record) {
    return null;
  }

  Object.assign(record, updates, { updatedAt: nowIso() });
  await writeIndexData(userDataPath, data);
  return record;
};

export const removeDocumentEmbeddings = async (
  userDataPath: string,
  documentId: string
): Promise<void> => {
  const data = await readIndexData(userDataPath);
  data.pageEmbeddings = data.pageEmbeddings.filter(
    (embedding) => embedding.documentId !== documentId
  );
  await writeIndexData(userDataPath, data);
};

export const savePageEmbedding = async (
  userDataPath: string,
  embeddingRecord: PageEmbeddingRecord
): Promise<void> => {
  if (embeddingRecord.embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("Invalid embedding dimension.");
  }

  const data = await readIndexData(userDataPath);
  const nextStoredEmbedding: StoredPageEmbeddingRecord = {
    documentId: embeddingRecord.documentId,
    pageNumber: embeddingRecord.pageNumber,
    embeddingBase64: serializeEmbedding(embeddingRecord.embedding)
  };

  data.pageEmbeddings = data.pageEmbeddings.filter(
    (storedEmbedding) =>
      !(
        storedEmbedding.documentId === embeddingRecord.documentId &&
        storedEmbedding.pageNumber === embeddingRecord.pageNumber
      )
  );
  data.pageEmbeddings.push(nextStoredEmbedding);

  await writeIndexData(userDataPath, data);
};

export const getPageEmbeddings = async (
  userDataPath: string,
  documentId: string
): Promise<PageEmbeddingRecord[]> => {
  const data = await readIndexData(userDataPath);

  return data.pageEmbeddings
    .filter((embedding) => embedding.documentId === documentId)
    .sort((first, second) => first.pageNumber - second.pageNumber)
    .map((embedding) => ({
      documentId: embedding.documentId,
      pageNumber: embedding.pageNumber,
      embedding: deserializeEmbedding(embedding.embeddingBase64)
    }));
};

export const getReadyDocumentByPath = async (
  userDataPath: string,
  pdfPath: string
): Promise<IndexedPdfRecord | null> => {
  const data = await readIndexData(userDataPath);
  const normalizedPdfPath = normalizePath(pdfPath);
  const records = data.documents
    .filter(
      (record) =>
        normalizePath(record.pdfPath) === normalizedPdfPath &&
        record.status === "ready" &&
        record.model === EMBEDDING_MODEL &&
        record.dimensions === EMBEDDING_DIMENSIONS &&
        record.rendererVersion === PAGE_RENDERER_VERSION &&
        record.indexVersion === INDEX_VERSION
    )
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

  return records[0] ?? null;
};

export const getPageEmbedding = async (
  userDataPath: string,
  documentId: string,
  pageNumber: number
): Promise<PageEmbeddingRecord | null> => {
  const data = await readIndexData(userDataPath);
  const storedEmbedding = data.pageEmbeddings.find(
    (embedding) =>
      embedding.documentId === documentId && embedding.pageNumber === pageNumber
  );

  if (!storedEmbedding) {
    return null;
  }

  return {
    documentId: storedEmbedding.documentId,
    pageNumber: storedEmbedding.pageNumber,
    embedding: deserializeEmbedding(storedEmbedding.embeddingBase64)
  };
};

export const getReadyPageEmbeddingsForDocuments = async (
  userDataPath: string,
  documentIds: string[]
): Promise<PageEmbeddingRecord[]> => {
  const data = await readIndexData(userDataPath);
  const wantedDocumentIds = new Set(documentIds);
  const readyDocumentIds = new Set(
    data.documents
      .filter(
        (record) =>
          wantedDocumentIds.has(record.documentId) &&
          record.status === "ready" &&
          record.model === EMBEDDING_MODEL &&
          record.dimensions === EMBEDDING_DIMENSIONS &&
          record.rendererVersion === PAGE_RENDERER_VERSION &&
          record.indexVersion === INDEX_VERSION
      )
      .map((record) => record.documentId)
  );

  return data.pageEmbeddings
    .filter((embedding) => readyDocumentIds.has(embedding.documentId))
    .sort((first, second) => first.pageNumber - second.pageNumber)
    .map((embedding) => ({
      documentId: embedding.documentId,
      pageNumber: embedding.pageNumber,
      embedding: deserializeEmbedding(embedding.embeddingBase64)
    }));
};

export const getProgressForPdfs = async (
  userDataPath: string,
  pdfPaths: string[]
): Promise<PdfIndexProgress[]> => {
  const data = await readIndexData(userDataPath);
  const wantedPaths = new Set(pdfPaths.map(normalizePath));
  const latestByPath = new Map<string, IndexedPdfRecord>();

  for (const record of data.documents) {
    const normalizedPdfPath = normalizePath(record.pdfPath);

    if (!wantedPaths.has(normalizedPdfPath)) {
      continue;
    }

    const current = latestByPath.get(normalizedPdfPath);
    if (!current || current.updatedAt.localeCompare(record.updatedAt) < 0) {
      latestByPath.set(normalizedPdfPath, record);
    }
  }

  return pdfPaths.map((pdfPath) => {
    const record = latestByPath.get(normalizePath(pdfPath));

    if (!record) {
      return {
        documentId: "",
        pdfPath,
        status: "not-indexed",
        pageCount: null,
        indexedPageCount: 0,
        errorMessage: null
      };
    }

    return toProgress(record);
  });
};

export const toProgress = (record: IndexedPdfRecord): PdfIndexProgress => ({
  documentId: record.documentId,
  pdfPath: record.pdfPath,
  status: record.status,
  pageCount: record.pageCount,
  indexedPageCount: record.indexedPageCount,
  errorMessage: record.errorMessage
});

export const markMissingPdfs = async (
  userDataPath: string,
  existingPdfPaths: string[]
): Promise<IndexedPdfRecord[]> => {
  const data = await readIndexData(userDataPath);
  const existingPaths = new Set(existingPdfPaths.map(normalizePath));
  const changedRecords: IndexedPdfRecord[] = [];

  for (const record of data.documents) {
    if (
      !existingPaths.has(normalizePath(record.pdfPath)) &&
      record.status !== "missing" &&
      record.status !== "stale"
    ) {
      record.status = "missing";
      record.updatedAt = nowIso();
      changedRecords.push(record);
    }
  }

  if (changedRecords.length > 0) {
    await writeIndexData(userDataPath, data);
  }

  return changedRecords;
};

export const setQueuedDocumentsWaitingForKey = async (
  userDataPath: string
): Promise<IndexedPdfRecord[]> => {
  const data = await readIndexData(userDataPath);
  const changedRecords: IndexedPdfRecord[] = [];

  for (const record of data.documents) {
    if (record.status === "queued" || record.status === "indexing") {
      record.status = "waiting-for-api-key";
      record.errorCode = null;
      record.errorMessage = null;
      record.updatedAt = nowIso();
      changedRecords.push(record);
    }
  }

  if (changedRecords.length > 0) {
    await writeIndexData(userDataPath, data);
  }

  return changedRecords;
};

export const getWaitingDocuments = async (
  userDataPath: string
): Promise<IndexedPdfRecord[]> => {
  const data = await readIndexData(userDataPath);
  return data.documents.filter((record) => record.status === "waiting-for-api-key");
};

export const getErrorUpdate = (
  errorCode: IndexingErrorCode,
  errorMessage: string
): Pick<IndexedPdfRecord, "status" | "errorCode" | "errorMessage"> => ({
  status: errorCode === "cancelled" ? "cancelled" : "failed",
  errorCode,
  errorMessage
});
