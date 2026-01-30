"use client";
import { memo, useState } from "react";

// --- ১. Nested Code Block Card with Glow ---
const CodeEditorCard = ({ code, lang }: { code: string; lang: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-8 sprint-container rounded-xl shadow-xl group">
      <div className="sprint-glow opacity-60 group-hover:opacity-100 transition-opacity" />
      <div className="sprint-inner bg-[#1E1E1E] rounded-[10px] overflow-hidden">
        <div className="flex justify-between items-center px-5 py-3 bg-[#252526] border-b border-white/5">
          <div className="flex gap-2 items-center">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
            </div>
            <span className="ml-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
              {lang || "ts"}
            </span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="text-[10px] font-bold text-gray-400 hover:text-[#D97757]"
          >
            {copied ? "DONE" : "COPY"}
          </button>
        </div>
        <div className="p-6 overflow-x-auto font-mono text-[14px] leading-[1.6] text-[#9CDCFE]">
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

// --- ২. Main Chat Message Component ---
export default memo(function ChatMessage({ message, streaming }: any) {
  const isAssistant = message.role === "assistant";
  const [mainCopied, setMainCopied] = useState(false);

  const renderCleanContent = (content: string) => {
    let cleanText = content
      .replace(/\[CONTEXT\][\s\S]*?\[TASK\]:/g, "")
      .replace(/^#+\s+/gm, "")
      .replace(/^-{3,}/gm, "")
      .trim();
    const segments = cleanText.split(/(```[\s\S]*?```)/g);

    return segments.map((seg, i) => {
      if (seg.startsWith("```")) {
        const lang = seg.match(/```(\w+)/)?.[1] || "";
        const code = seg.replace(/```(\w+)?\n?/, "").replace(/```$/, "");
        return <CodeEditorCard key={i} code={code} lang={lang} />;
      }
      return (
        <div key={i} className="mb-4 whitespace-pre-wrap">
          {seg}
        </div>
      );
    });
  };

  return (
    <div
      className={`flex w-full ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`relative w-full ${isAssistant ? "max-w-5xl" : "max-w-2xl"}`}
      >
        {/* Sticky Copy Button */}
        {isAssistant && (
          <div className="absolute -right-14 top-0 h-full hidden lg:block">
            <div className="sticky top-6">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(message.content);
                  setMainCopied(true);
                  setTimeout(() => setMainCopied(false), 2000);
                }}
                className="p-3 bg-white border border-[#E5E5E2] rounded-2xl shadow-lg hover:text-[#D97757]"
              >
                {mainCopied ? (
                  "OK"
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {/* --- Assistant Main Response Card with Glow --- */}
        <div
          className={`${isAssistant ? "sprint-container rounded-[42px] shadow-2xl" : ""}`}
        >
          {isAssistant && <div className="sprint-glow opacity-30" />}

          <div
            className={`sprint-inner rounded-[40px] p-10 ${isAssistant ? "bg-[#F0F0EE] border border-[#E5E5E2] text-[#353330]" : "bg-[#1d1d1f] text-white shadow-xl"}`}
          >
            <div className="text-[17px] tracking-tight leading-relaxed">
              {isAssistant
                ? renderCleanContent(message.content)
                : message.displayContent || message.content}
              {streaming && (
                <span className="inline-block w-1.5 h-6 ml-2 bg-[#D97757] animate-bounce" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
