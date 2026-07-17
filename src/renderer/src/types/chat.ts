import type { RetrievalResult } from "../../../shared/retrieval";

export type ChatRole = "user" | "assistant" | "system";

interface BaseChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface UserChatMessage extends BaseChatMessage {
  role: "user";
  pageNumber?: number;
}

export interface SystemChatMessage extends BaseChatMessage {
  role: "system";
}

export interface AssistantTextChatMessage extends BaseChatMessage {
  role: "assistant";
  kind?: "text";
}

export interface EvidenceChatMessage extends BaseChatMessage {
  role: "assistant";
  kind: "evidence-results";
  evidence: RetrievalResult[];
}

export interface ReasoningAnswerChatMessage extends BaseChatMessage {
  role: "assistant";
  kind: "reasoning-answer";
  evidence: RetrievalResult[];
}

export type ChatMessage =
  | UserChatMessage
  | SystemChatMessage
  | AssistantTextChatMessage
  | EvidenceChatMessage
  | ReasoningAnswerChatMessage;

export interface ChatRequest {
  messages: ChatMessage[];
  folderPath: string;
  currentPdfPath: string;
  currentPage: number;
  query: string;
}

export interface ChatResponse {
  message: ChatMessage | null;
}

export interface ChatService {
  sendMessage(request: ChatRequest): Promise<ChatResponse>;
}
