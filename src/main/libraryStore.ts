import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface LibraryData {
  folders: string[];
}

const libraryFileName = "library.json";

const getLibraryFilePath = (userDataPath: string): string =>
  path.join(userDataPath, libraryFileName);

const isLibraryData = (value: unknown): value is LibraryData => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeData = value as Partial<LibraryData>;
  return Array.isArray(maybeData.folders);
};

const normalizeFolderPath = (folderPath: string): string => path.normalize(folderPath);

const uniqueFolders = (folders: string[]): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const folder of folders) {
    if (typeof folder !== "string" || folder.trim().length === 0) {
      continue;
    }

    const normalized = normalizeFolderPath(folder);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(normalized);
    }
  }

  return unique;
};

export const getFolders = async (userDataPath: string): Promise<string[]> => {
  try {
    const fileContents = await readFile(getLibraryFilePath(userDataPath), "utf8");
    const parsedData: unknown = JSON.parse(fileContents);

    if (!isLibraryData(parsedData)) {
      return [];
    }

    return uniqueFolders(parsedData.folders);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") {
      console.error("Failed to load library folders:", error);
    }

    return [];
  }
};

export const saveFolders = async (
  userDataPath: string,
  folders: string[]
): Promise<void> => {
  await mkdir(userDataPath, { recursive: true });
  await writeFile(
    getLibraryFilePath(userDataPath),
    JSON.stringify({ folders: uniqueFolders(folders) }, null, 2),
    "utf8"
  );
};

export const addFolder = async (
  userDataPath: string,
  folderPath: string
): Promise<string[]> => {
  if (typeof folderPath !== "string" || folderPath.trim().length === 0) {
    return getFolders(userDataPath);
  }

  const folders = await getFolders(userDataPath);
  const normalizedFolderPath = normalizeFolderPath(folderPath);

  if (folders.includes(normalizedFolderPath)) {
    return folders;
  }

  const updatedFolders = [...folders, normalizedFolderPath];
  await saveFolders(userDataPath, updatedFolders);

  return updatedFolders;
};

export const removeFolder = async (
  userDataPath: string,
  folderPath: string
): Promise<string[]> => {
  if (typeof folderPath !== "string" || folderPath.trim().length === 0) {
    return getFolders(userDataPath);
  }

  const folders = await getFolders(userDataPath);
  const normalizedFolderPath = normalizeFolderPath(folderPath);
  const updatedFolders = folders.filter((folder) => folder !== normalizedFolderPath);

  await saveFolders(userDataPath, updatedFolders);

  return updatedFolders;
};
