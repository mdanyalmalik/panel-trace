import ChatInput from "./ChatInput";
import ChatMessageList from "./ChatMessageList";
import type { ChatMessage } from "../types/chat";

interface ReaderChatPanelProps {
  messages: ChatMessage[];
  input: string;
  isSending: boolean;
  error: string | null;
  onInputChange: (value: string) => void;
  onSend: () => Promise<void>;
}

const ReaderChatPanel = ({
  messages,
  input,
  isSending,
  error,
  onInputChange,
  onSend
}: ReaderChatPanelProps): JSX.Element => (
  <aside
    className="flex h-full min-h-0 w-full shrink-0 flex-col border-l border-zinc-700 bg-zinc-900"
    aria-label="Reader chat"
  >
    <div className="shrink-0 border-b border-zinc-700 px-4 py-3">
      <h2 className="text-sm font-bold text-zinc-100">Chat</h2>
    </div>

    <ChatMessageList messages={messages} />

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
