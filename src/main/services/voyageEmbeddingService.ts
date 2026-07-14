import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL
} from "../../shared/indexing";
import type { IndexingErrorCode } from "../../shared/indexing";
import type { VoyageConnectionTestResult } from "../../shared/voyage";
import { loadVoyageApiKey } from "./secureCredentialStore";

interface VoyageEmbeddingResponse {
  data?: Array<{
    embedding?: number[];
  }>;
  embeddings?: number[][];
  usage?: {
    total_tokens?: number;
    text_tokens?: number;
    image_pixels?: number;
  };
}

interface EmbedPageResult {
  embedding: number[];
  usage: {
    totalTokens: number | null;
    textTokens: number | null;
    imagePixels: number | null;
  };
}

export class VoyageEmbeddingError extends Error {
  code: IndexingErrorCode;
  retryable: boolean;

  constructor(code: IndexingErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "VoyageEmbeddingError";
    this.code = code;
    this.retryable = retryable;
  }
}

const voyageEndpoint = "https://api.voyageai.com/v1/multimodalembeddings";
const requestTimeoutMs = 30_000;
const maxAttempts = 3;

const sleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const getEmbeddingFromResponse = (response: VoyageEmbeddingResponse): number[] | null => {
  if (Array.isArray(response.embeddings) && Array.isArray(response.embeddings[0])) {
    return response.embeddings[0];
  }

  const firstDataEmbedding = response.data?.[0]?.embedding;
  return Array.isArray(firstDataEmbedding) ? firstDataEmbedding : null;
};

const classifyStatus = (status: number): VoyageEmbeddingError => {
  if (status === 401 || status === 403) {
    return new VoyageEmbeddingError("invalid-api-key", "The saved API key is invalid.");
  }

  if (status === 429) {
    return new VoyageEmbeddingError(
      "voyage-rate-limited",
      "The embedding service is rate limited.",
      true
    );
  }

  if (status >= 500) {
    return new VoyageEmbeddingError(
      "voyage-provider-error",
      "The embedding service is unavailable.",
      true
    );
  }

  return new VoyageEmbeddingError(
    "voyage-provider-error",
    "The embedding service rejected the request."
  );
};

const requestVoyageEmbedding = async (
  apiKey: string,
  pageImageDataUrl: string
): Promise<EmbedPageResult> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(voyageEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: [
          {
            content: [
              {
                type: "image_base64",
                image_base64: pageImageDataUrl
              }
            ]
          }
        ],
        model: EMBEDDING_MODEL,
        input_type: "document"
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw classifyStatus(response.status);
    }

    const parsedResponse = (await response.json()) as VoyageEmbeddingResponse;
    const embedding = getEmbeddingFromResponse(parsedResponse);

    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new VoyageEmbeddingError(
        "invalid-embedding",
        "The embedding service returned an invalid vector."
      );
    }

    return {
      embedding,
      usage: {
        totalTokens: parsedResponse.usage?.total_tokens ?? null,
        textTokens: parsedResponse.usage?.text_tokens ?? null,
        imagePixels: parsedResponse.usage?.image_pixels ?? null
      }
    };
  } catch (error) {
    if (error instanceof VoyageEmbeddingError) {
      throw error;
    }

    throw new VoyageEmbeddingError(
      "voyage-network-error",
      "Connection failed.",
      true
    );
  } finally {
    clearTimeout(timeout);
  }
};

export const embedPageImage = async (
  userDataPath: string,
  pageImageDataUrl: string
): Promise<EmbedPageResult> => {
  const apiKey = await loadVoyageApiKey(userDataPath);

  if (!apiKey) {
    throw new VoyageEmbeddingError(
      "missing-api-key",
      "Voyage API key is not configured."
    );
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await requestVoyageEmbedding(apiKey, pageImageDataUrl);
    } catch (error) {
      if (
        !(error instanceof VoyageEmbeddingError) ||
        !error.retryable ||
        attempt === maxAttempts
      ) {
        throw error;
      }

      await sleep(400 * 2 ** (attempt - 1));
    }
  }

  throw new VoyageEmbeddingError("voyage-provider-error", "Connection failed.");
};

export const testVoyageConnection = async (
  userDataPath: string,
  apiKey?: string
): Promise<VoyageConnectionTestResult> => {
  const keyToTest = apiKey?.trim() || (await loadVoyageApiKey(userDataPath));

  if (!keyToTest) {
    return {
      ok: false,
      code: "missing-key",
      message: "Voyage API key is not configured."
    };
  }

  try {
    await requestVoyageEmbedding(
      keyToTest,
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    );

    return {
      ok: true,
      code: "success",
      message: "Connection successful"
    };
  } catch (error) {
    if (error instanceof VoyageEmbeddingError) {
      if (error.code === "invalid-api-key") {
        return { ok: false, code: "invalid-key", message: "Invalid API key" };
      }

      if (error.code === "voyage-rate-limited") {
        return { ok: false, code: "rate-limited", message: "Rate limited" };
      }

      if (error.code === "voyage-network-error") {
        return { ok: false, code: "network-error", message: "Connection failed" };
      }
    }

    return { ok: false, code: "provider-error", message: "Connection failed" };
  }
};
