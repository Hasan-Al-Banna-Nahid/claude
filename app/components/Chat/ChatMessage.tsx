// app/components/Chat/ChatMessage.tsx
"use client";

import React, { useState } from "react";
import { Message } from "@/app/types";
import {
  Bot,
  User,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Edit,
  BookOpen,
  Code,
  Download,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [copiedCodeBlocks, setCopiedCodeBlocks] = useState<
    Record<number, boolean>
  >({});

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCodeCopy = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedCodeBlocks((prev) => ({ ...prev, [index]: true }));
    setTimeout(() => {
      setCopiedCodeBlocks((prev) => ({ ...prev, [index]: false }));
    }, 2000);
  };

  const extractCodeBlocks = (content: string): string[] => {
    const codeBlocks: string[] = [];
    const regex = /```[\s\S]*?```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      codeBlocks.push(match[0]);
    }
    return codeBlocks;
  };

  const codeBlocks = extractCodeBlocks(message.content);

  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      const codeString = String(children).replace(/\n$/, "");
      const index = codeBlocks.findIndex((block) => block.includes(codeString));

      return !inline && match ? (
        <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-800">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-gray-300">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                <span className="text-sm font-medium">{match[1]}</span>
              </div>
              <span className="text-xs text-gray-500">
                {codeString.split("\n").length} lines
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCodeCopy(codeString, index)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                  copiedCodeBlocks[index]
                    ? "bg-green-500 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                }`}
              >
                {copiedCodeBlocks[index] ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([codeString], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `code-${Date.now()}.${match[1]}`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
            </div>
          </div>
        </div>
      ) : (
        <code
          className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
    p({ children }: any) {
      return (
        <p className="mb-4 last:mb-0 text-gray-700 dark:text-gray-300 leading-relaxed">
          {children}
        </p>
      );
    },
    ul({ children }: any) {
      return (
        <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700 dark:text-gray-300">
          {children}
        </ul>
      );
    },
    ol({ children }: any) {
      return (
        <ol className="list-decimal pl-6 mb-4 space-y-2 text-gray-700 dark:text-gray-300">
          {children}
        </ol>
      );
    },
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 py-2 rounded-r-lg">
          {children}
        </blockquote>
      );
    },
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: any) {
      return <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>;
    },
    th({ children }: any) {
      return (
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return (
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
          {children}
        </td>
      );
    },
  };

  return (
    <div className="group relative">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              message.role === "user"
                ? "bg-gradient-to-br from-blue-500 to-blue-600"
                : "bg-gradient-to-br from-purple-500 to-pink-500"
            }`}
          >
            {message.role === "user" ? (
              <User className="w-5 h-5 text-white" />
            ) : (
              <Bot className="w-5 h-5 text-white" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="font-semibold text-gray-900 dark:text-white">
              {message.role === "user" ? "You" : "Claude"}
            </span>
            {message.model && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {message.model}
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {format(new Date(message.timestamp), "h:mm a")}
            </span>
          </div>

          {/* Message Content */}
          <div className="text-gray-800 dark:text-gray-200">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {codeBlocks.length > 0 && (
                <div className="flex items-center gap-1">
                  <Code className="w-4 h-4" />
                  <span>
                    {codeBlocks.length} code block
                    {codeBlocks.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {message.tokens && (
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{message.tokens.toLocaleString()} tokens</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {message.role === "assistant" && (
                <>
                  <button
                    onClick={() => {}}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Helpful"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {}}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Not helpful"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </>
              )}
              {message.role === "user" && (
                <button
                  onClick={() => {}}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Edit message"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleCopy}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Copy entire message"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
