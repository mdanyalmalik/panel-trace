export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  documentPath: string;
  currentPage: number;
}

export interface ChatResponse {
  message: ChatMessage | null;
}

export interface ChatService {
  sendMessage(request: ChatRequest): Promise<ChatResponse>;
}
