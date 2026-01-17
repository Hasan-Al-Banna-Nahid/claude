"use client";

import { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "claude-chat-history";

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const streamBuffer = useRef("");
  const rafId = useRef<number | null>(null);

  /* ---------------- Restore chat from localStorage ---------------- */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setMessages(JSON.parse(saved));
    }
  }, []);

  /* ---------------- Persist chat ---------------- */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  /* ---------------- Smooth auto scroll ---------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const flushBuffer = () => {
    setMessages((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = {
        ...copy[copy.length - 1],
        content: streamBuffer.current,
      };
      return copy;
    });
    rafId.current = null;
  };

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { role: "user", content: input };

    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: "assistant", content: "" },
    ]);

    setInput("");
    setIsStreaming(true);
    streamBuffer.current = "";

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        stream: true,
        messages: [...messages, userMessage],
      }),
    });

    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.replace("data:", "").trim();
        if (data === "[DONE]") break;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.content;
          if (!token) continue;

          streamBuffer.current += token;
          if (!rafId.current) {
            rafId.current = requestAnimationFrame(flushBuffer);
          }
        } catch {}
      }
    }

    setIsStreaming(false);
  }

  return (
    <div className="flex flex-col h-screen bg-[#f7f7f8]">
      {/* Chat */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
      >
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            message={msg}
            streaming={isStreaming}
            isLast={i === messages.length - 1}
          />
        ))}
      </div>

      {/* Input */}
      <div className="border-t bg-white px-6 py-4">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message Claude…"
            className="flex-1 text-teal-900 rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring"
          />
          <button
            onClick={sendMessage}
            className="rounded-lg bg-black text-white px-5 text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
