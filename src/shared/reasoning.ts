import type { RetrievalRequest, RetrievalResult, RetrievalStatus } from "./retrieval";

export const GEMINI_REASONING_PROVIDER_ID = "gemini";
export const GEMINI_REASONING_MODEL = "gemini-3.5-flash";

export interface GeminiKeyStatus {
  configured: boolean;
  secureStorageAvailable: boolean;
}

export type GeminiConnectionTestCode =
  | "success"
  | "missing-key"
  | "invalid-key"
  | "rate-limited"
  | "network-error"
  | "provider-error"
  | "secure-storage-unavailable";

export interface GeminiConnectionTestResult {
  ok: boolean;
  code: GeminiConnectionTestCode;
  message: string;
}

export interface ReasoningChatRequest extends RetrievalRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}

export type ReasoningChatStatus =
  | "success"
  | "missing-api-key"
  | "provider-error"
  | "retrieval-error";

export interface ReasoningChatResponse {
  markdown: string;
  evidence: RetrievalResult[];
  status: ReasoningChatStatus;
  retrievalStatus: RetrievalStatus;
  message?: string;
}
