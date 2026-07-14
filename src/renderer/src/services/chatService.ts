import type { ChatMessage, ChatResponse, ChatService } from "../types/chat";

export const chatService: ChatService = {
  async sendMessage(request): Promise<ChatResponse> {
    const response = await window.electronAPI.searchEarlierPages({
      folderPath: request.folderPath,
      currentPdfPath: request.currentPdfPath,
      currentPage: request.currentPage,
      query: request.query
    });

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      kind: "evidence-results",
      content: response.message ?? "Relevant earlier pages",
      evidence: response.results,
      createdAt: new Date().toISOString()
    };

    return { message };
  }
};
