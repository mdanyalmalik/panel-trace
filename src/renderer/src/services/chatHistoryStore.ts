import type { ChatMessage } from "../types/chat";
import type { RetrievalResult } from "../../../shared/retrieval";

const chatHistoryKeyPrefix = "panel-trace:chat-history:";
const maxStoredMessages = 300;

const getChatHistoryKey = (pdfPath: string): string => `${chatHistoryKeyPrefix}${pdfPath}`;

const isRetrievalResult = (value: unknown): value is RetrievalResult => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeResult = value as Partial<RetrievalResult>;

  return (
    typeof maybeResult.id === "string" &&
    typeof maybeResult.pdfPath === "string" &&
    typeof maybeResult.pdfName === "string" &&
    typeof maybeResult.pageNumber === "number" &&
    Number.isFinite(maybeResult.pageNumber) &&
    typeof maybeResult.score === "number" &&
    Number.isFinite(maybeResult.score)
  );
};

const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeMessage = value as Partial<ChatMessage>;

  const hasBaseFields =
    typeof maybeMessage.id === "string" &&
    (maybeMessage.role === "user" ||
      maybeMessage.role === "assistant" ||
      maybeMessage.role === "system") &&
    typeof maybeMessage.content === "string" &&
    typeof maybeMessage.createdAt === "string";

  if (!hasBaseFields) {
    return false;
  }

  if (maybeMessage.role !== "assistant" || maybeMessage.kind !== "evidence-results") {
    return true;
  }

  return Array.isArray(maybeMessage.evidence) && maybeMessage.evidence.every(isRetrievalResult);
};

const sanitizeMessages = (messages: ChatMessage[]): ChatMessage[] =>
  messages
    .filter((message) => message.content.trim().length > 0)
    .slice(-maxStoredMessages);

export const loadChatHistory = (pdfPath: string): ChatMessage[] => {
  try {
    const storedHistory = window.localStorage.getItem(getChatHistoryKey(pdfPath));

    if (!storedHistory) {
      return [];
    }

    const parsedHistory: unknown = JSON.parse(storedHistory);

    if (!Array.isArray(parsedHistory)) {
      return [];
    }

    return sanitizeMessages(parsedHistory.filter(isChatMessage));
  } catch (error) {
    console.error("Unable to load chat history:", error);
    return [];
  }
};

export const saveChatHistory = (pdfPath: string, messages: ChatMessage[]): void => {
  try {
    const sanitizedMessages = sanitizeMessages(messages);

    if (sanitizedMessages.length === 0) {
      window.localStorage.removeItem(getChatHistoryKey(pdfPath));
      return;
    }

    window.localStorage.setItem(
      getChatHistoryKey(pdfPath),
      JSON.stringify(sanitizedMessages)
    );
  } catch (error) {
    console.error("Unable to save chat history:", error);
  }
};
