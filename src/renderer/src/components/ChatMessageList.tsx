import { useEffect, useRef } from "react";

import type { ChatMessage } from "../types/chat";

interface ChatMessageListProps {
  messages: ChatMessage[];
}

const ChatMessageList = ({ messages }: ChatMessageListProps): JSX.Element => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

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
        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  );
};

export default ChatMessageList;
