import { useLayoutEffect, useRef } from "react";

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
    <div className="shrink-0 border-t border-zinc-700 bg-zinc-900 p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          className="max-h-36 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm leading-5 text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-400/15"
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
          className="h-11 shrink-0 cursor-pointer rounded-lg bg-teal-600 px-4 text-sm font-bold text-white transition duration-75 hover:bg-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-400/25 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          type="button"
          disabled={!canSend}
          onClick={() => void submitMessage()}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
