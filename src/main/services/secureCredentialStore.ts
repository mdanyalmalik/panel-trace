import { safeStorage } from "electron";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { VoyageKeyStatus } from "../../shared/voyage";

const secretsDirectoryName = "secrets";
const voyageApiKeyFileName = "voyage-api-key.bin";

const getVoyageKeyPath = (userDataPath: string): string =>
  path.join(userDataPath, secretsDirectoryName, voyageApiKeyFileName);

export const getVoyageKeyStatus = async (
  userDataPath: string
): Promise<VoyageKeyStatus> => {
  const secureStorageAvailable = safeStorage.isEncryptionAvailable();

  try {
    await readFile(getVoyageKeyPath(userDataPath));
    return {
      configured: true,
      secureStorageAvailable
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") {
      console.error("Unable to read Voyage key status:", error);
    }

    return {
      configured: false,
      secureStorageAvailable
    };
  }
};

export const saveVoyageApiKey = async (
  userDataPath: string,
  apiKey: string
): Promise<VoyageKeyStatus> => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Secure credential storage is unavailable on this system.");
  }

  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    throw new Error("Voyage API key is required.");
  }

  const keyFilePath = getVoyageKeyPath(userDataPath);
  await mkdir(path.dirname(keyFilePath), { recursive: true });
  await writeFile(keyFilePath, safeStorage.encryptString(trimmedApiKey));

  return getVoyageKeyStatus(userDataPath);
};

export const loadVoyageApiKey = async (userDataPath: string): Promise<string | null> => {
  if (!safeStorage.isEncryptionAvailable()) {
    return null;
  }

  try {
    const encryptedKey = await readFile(getVoyageKeyPath(userDataPath));
    return safeStorage.decryptString(encryptedKey);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") {
      console.error("Unable to load Voyage API key:", error);
    }

    return null;
  }
};

export const removeVoyageApiKey = async (
  userDataPath: string
): Promise<VoyageKeyStatus> => {
  await rm(getVoyageKeyPath(userDataPath), { force: true });
  return getVoyageKeyStatus(userDataPath);
};
