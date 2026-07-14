import { useEffect, useRef } from "react";

import type { ChatMessage } from "../types/chat";
import type { RetrievalResult } from "../../../shared/retrieval";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isSearching: boolean;
  onOpenEvidence: (result: RetrievalResult) => void;
}

const ChatMessageList = ({
  messages,
  isSearching,
  onOpenEvidence
}: ChatMessageListProps): JSX.Element => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSearching]);

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      role="log"
      aria-live="polite"
      aria-label="Chat history"
    >
      <div className="flex min-h-full flex-col justify-end gap-3">
        {messages.map((message) => {
          if (message.role === "system") {
            return (
              <p
                key={message.id}
                className="mx-auto max-w-full whitespace-pre-wrap break-words px-2 text-center text-xs text-zinc-500"
              >
                {message.content}
              </p>
            );
          }

          const isUser = message.role === "user";

          if (message.role === "assistant" && message.kind === "evidence-results") {
            return (
              <div key={message.id} className="flex max-w-full justify-start">
                <div className="max-w-[92%] rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm text-zinc-100 shadow-sm">
                  <p className="mb-3 font-bold text-zinc-100">
                    {message.evidence.length > 0 ? "Relevant earlier pages" : message.content}
                  </p>
                  {message.evidence.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {message.evidence.map((result) => (
                        <button
                          key={result.id}
                          className="cursor-pointer rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-left transition duration-75 hover:-translate-y-0.5 hover:border-teal-400 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-teal-400/20 active:translate-y-0"
                          type="button"
                          onClick={() => onOpenEvidence(result)}
                        >
                          <span className="block font-semibold text-zinc-100">
                            {result.pdfName} - Page {result.pageNumber}
                          </span>
                          <span className="mt-1 block text-xs font-medium text-zinc-400">
                            Similarity: {result.score.toFixed(3)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          }

          return (
            <div
              key={message.id}
              className={`flex max-w-full ${isUser ? "justify-end" : "justify-start"}`}
            >
              <p
                className={`max-w-[88%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm leading-6 shadow-sm ${
                  isUser
                    ? "bg-teal-700 text-teal-50"
                    : "border border-zinc-700 bg-zinc-800 text-zinc-100"
                }`}
              >
                {message.content}
              </p>
            </div>
          );
        })}
        {isSearching ? (
          <div className="flex max-w-full justify-start">
            <p className="max-w-[88%] rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm leading-6 text-zinc-400 shadow-sm">
              Searching earlier pages...
            </p>
          </div>
        ) : null}
        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  );
};

export default ChatMessageList;
