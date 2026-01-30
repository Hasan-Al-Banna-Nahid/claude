"use client";
import { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import { v4 as uuidv4 } from "uuid";

export default function ChatInterface() {
  const [sessions, setSessions] = useState<any>({});
  const [currentId, setCurrentId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [projectFiles, setProjectFiles] = useState<
    { name: string; content: string }[]
  >([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("claude_v45_sessions");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed);
      const keys = Object.keys(parsed);
      if (keys.length > 0 && !currentId) setCurrentId(keys[keys.length - 1]);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(sessions).length > 0) {
      localStorage.setItem("claude_v45_sessions", JSON.stringify(sessions));
    }
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [sessions, isStreaming]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (text.length > 500) {
      e.preventDefault();
      const fileName = `Module_${new Date().getTime().toString().slice(-4)}.ts`;
      setProjectFiles((prev) => [...prev, { name: fileName, content: text }]);
    }
  };

  async function sendMessage() {
    if ((!input.trim() && projectFiles.length === 0) || isStreaming) return;

    const chatId = currentId || uuidv4();
    if (!currentId) setCurrentId(chatId);

    // প্রম্পট ইঞ্জিনিয়ারিং: SOLID, DRY, SSOT
    const contextStr = projectFiles
      .map((f) => `FILE: ${f.name}\n${f.content}`)
      .join("\n\n");
    const fullPrompt = `[CONTEXT]\n${contextStr}\n\n[TASK]: ${input}`;

    const userMsg = {
      role: "user",
      content: fullPrompt,
      displayContent: input || `Updating ${projectFiles.length} modules...`,
      attachedFiles: [...projectFiles],
    };

    setSessions((prev: any) => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        title:
          prev[chatId]?.title && prev[chatId]?.title !== "New Project"
            ? prev[chatId].title
            : input.slice(0, 25) || "Code Update",
        messages: [
          ...(prev[chatId]?.messages || []),
          userMsg,
          { role: "assistant", content: "" },
        ],
        timestamp: Date.now(),
      },
    }));

    setInput("");
    setProjectFiles([]); // Clear context files after sending
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [...(sessions[chatId]?.messages || []), userMsg].map(
            (m) => ({ role: m.role, content: m.content }),
          ),
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace("data: ", ""));
            assistantText += data.content || "";
            setSessions((prev: any) => ({
              ...prev,
              [chatId]: {
                ...prev[chatId],
                messages: [
                  ...prev[chatId].messages.slice(0, -1),
                  { role: "assistant", content: assistantText },
                ],
              },
            }));
          } catch (e) {}
        }
      }
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex h-screen bg-[#F9F9F8] text-[#1d1d1f] w-full overflow-hidden font-sans relative">
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-[70] p-2.5 bg-white border border-[#E5E5E2] rounded-xl shadow-lg text-[#D97757] hover:scale-105 transition-all"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          {isSidebarOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <path d="M3 12h18M3 6h18M3 18h18" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#F0F0EE] border-r border-[#E5E5E2] transition-all duration-500 ease-in-out ${isSidebarOpen ? "w-72 opacity-100 visible" : "w-0 opacity-0 invisible -translate-x-full"}`}
      >
        <div className="p-4 pt-20 flex flex-col h-full min-w-[288px]">
          <button
            onClick={() => {
              setCurrentId(uuidv4());
              setProjectFiles([]);
            }}
            className="w-full py-3 mb-6 bg-[#1d1d1f] text-white rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all"
          >
            + New Project
          </button>
          <div className="flex-1 overflow-y-auto space-y-2">
            {Object.entries(sessions)
              .sort((a: any, b: any) => b[1].timestamp - a[1].timestamp)
              .map(([id, session]: any) => (
                <div
                  key={id}
                  onClick={() => setCurrentId(id)}
                  className={`px-4 py-3 rounded-xl cursor-pointer transition-all border ${currentId === id ? "bg-white border-[#E5E5E2] shadow-sm" : "border-transparent hover:bg-white/40"}`}
                >
                  <p className="text-sm truncate font-bold text-gray-700">
                    {session.title || "Untitled"}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-500 ${isSidebarOpen ? "ml-72" : "ml-0"}`}
      >
        <header className="h-16 flex items-center px-6 pl-20 border-b border-gray-100 bg-white/60 backdrop-blur-xl sticky top-0 z-40">
          <div className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-400">
            Claude 4.5 Architect
          </div>
          {projectFiles.length > 0 && (
            <span className="ml-4 px-2 py-0.5 bg-orange-100 text-orange-600 text-[9px] font-bold rounded-full border border-orange-200 animate-pulse">
              {projectFiles.length} FILES STAGED
            </span>
          )}
        </header>

        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 md:px-20 lg:px-44 py-12 space-y-12"
        >
          {(sessions[currentId]?.messages || []).map((msg: any, i: number) => (
            <ChatMessage
              key={i}
              message={msg}
              streaming={
                isStreaming && i === sessions[currentId].messages.length - 1
              }
            />
          ))}
        </main>

        <footer className="p-8 w-full max-w-5xl mx-auto">
          <div className="bg-white border border-[#E5E5E2] rounded-[32px] p-2 shadow-2xl transition-all">
            <div className="flex items-end p-3 gap-3">
              <textarea
                value={input}
                onPaste={handlePaste}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  (e.preventDefault(), sendMessage())
                }
                placeholder="Message or paste code..."
                className="flex-1 bg-transparent border-none outline-none text-[16px] py-2 px-1 resize-none min-h-[44px]"
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={
                  isStreaming || (!input.trim() && projectFiles.length === 0)
                }
                className={`p-4 rounded-2xl shadow-lg transition-all ${isStreaming || (!input.trim() && projectFiles.length === 0) ? "bg-gray-100 text-gray-400" : "bg-[#D97757] text-white hover:scale-105 active:scale-95"}`}
              >
                {isStreaming ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
