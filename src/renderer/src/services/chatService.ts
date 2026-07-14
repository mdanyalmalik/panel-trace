import type { ChatResponse, ChatService } from "../types/chat";

export const chatService: ChatService = {
  async sendMessage(): Promise<ChatResponse> {
    return { message: null };
  }
};
