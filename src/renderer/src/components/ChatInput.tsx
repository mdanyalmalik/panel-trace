import { useLayoutEffect, useRef } from "react";

import { SendIcon } from "./icons";

interface ChatInputProps {
  input: string;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onSend: () => Promise<void>;
}

const ChatInput = ({
  input,
  isSending,
  onInputChange,
  onSend
}: ChatInputProps): JSX.Element => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canSend = input.trim().length > 0 && !isSending;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }, [input]);

  const submitMessage = async (): Promise<void> => {
    if (!canSend) {
      return;
    }

    await onSend();
    textareaRef.current?.focus();
  };

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          className="chat-input-textarea max-h-36 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm leading-5 text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-400/15"
          value={input}
          rows={1}
          placeholder="Type a message..."
          aria-label="Chat message"
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submitMessage();
            }
          }}
        />
        <button
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-teal-300/30 bg-teal-500 text-zinc-950 shadow-lg shadow-teal-950/20 transition duration-75 hover:-translate-y-0.5 hover:bg-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-400/25 active:translate-y-0 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none disabled:hover:translate-y-0"
          type="button"
          disabled={!canSend}
          onClick={() => void submitMessage()}
          aria-label={isSending ? "Sending message" : "Send message"}
        >
          <SendIcon className="size-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
