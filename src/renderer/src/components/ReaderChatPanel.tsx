import ChatInput from "./ChatInput";
import ChatMessageList from "./ChatMessageList";
import { MessageSquareIcon, TrashIcon } from "./icons";
import type { ChatMessage } from "../types/chat";
import type { RetrievalResult } from "../../../shared/retrieval";

interface ReaderChatPanelProps {
  messages: ChatMessage[];
  input: string;
  isSending: boolean;
  error: string | null;
  isSearching: boolean;
  onClearChat: () => void;
  onInputChange: (value: string) => void;
  onOpenEvidence: (result: RetrievalResult) => void;
  onSend: () => Promise<void>;
}

const ReaderChatPanel = ({
  messages,
  input,
  isSending,
  error,
  isSearching,
  onClearChat,
  onInputChange,
  onOpenEvidence,
  onSend
}: ReaderChatPanelProps): JSX.Element => (
  <aside
    className="flex h-full min-h-0 w-full shrink-0 flex-col border-l border-zinc-700 bg-zinc-950/95 shadow-2xl shadow-zinc-950/30"
    aria-label="Reader chat"
  >
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
        <MessageSquareIcon className="size-4 text-teal-200" />
        Chat
      </h2>
      <button
        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-bold text-zinc-300 transition duration-75 hover:-translate-y-0.5 hover:border-red-300/60 hover:bg-red-500/10 hover:text-red-100 focus:outline-none focus:ring-4 focus:ring-red-300/15 active:translate-y-0 disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0"
        type="button"
        onClick={onClearChat}
        disabled={messages.length === 0 || isSending}
      >
        <TrashIcon className="size-3.5" />
        Clear
      </button>
    </div>

    <ChatMessageList
      messages={messages}
      isSearching={isSearching}
      onOpenEvidence={onOpenEvidence}
    />

    {error ? (
      <p className="shrink-0 px-4 pb-2 text-xs font-medium text-red-300" role="alert">
        {error}
      </p>
    ) : null}

    <ChatInput
      input={input}
      isSending={isSending}
      onInputChange={onInputChange}
      onSend={onSend}
    />
  </aside>
);

export default ReaderChatPanel;
