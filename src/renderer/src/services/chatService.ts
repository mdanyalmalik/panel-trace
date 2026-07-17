import type { ChatMessage, ChatResponse, ChatService } from "../types/chat";

export const chatService: ChatService = {
  async sendMessage(request): Promise<ChatResponse> {
    const response = await window.electronAPI.askReasoningProvider({
      messages: request.messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      folderPath: request.folderPath,
      currentPdfPath: request.currentPdfPath,
      currentPage: request.currentPage,
      query: request.query
    });

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      kind: "reasoning-answer",
      content: response.markdown,
      evidence: response.evidence,
      createdAt: new Date().toISOString()
    };

    return { message };
  }
};
