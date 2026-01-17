import { memo } from "react";

type Props = {
  message: {
    role: "user" | "assistant";
    content: string;
  };
  isLast: boolean;
  streaming: boolean;
};

const ChatMessage = memo(function ChatMessage({
  message,
  isLast,
  streaming,
}: Props) {
  const isAssistant = message.role === "assistant";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`relative max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isAssistant ? "bg-white text-gray-900 border" : "bg-black text-white"
        }`}
      >
        {/* Role label */}
        <div className="mb-1 text-xs font-medium opacity-60">
          {isAssistant ? "Claude" : "You"}
        </div>

        {/* Message */}
        <div className="prose prose-sm max-w-none">
          {message.content}
          {isAssistant && isLast && streaming && (
            <span className="ml-1 animate-pulse">▍</span>
          )}
        </div>

        {/* Copy button */}
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 text-xs opacity-50 hover:opacity-100"
        >
          Copy
        </button>
      </div>
    </div>
  );
});

export default ChatMessage;
