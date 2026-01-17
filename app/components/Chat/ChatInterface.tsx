// app/components/Chat/ChatInterface.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Message, Model } from "@/app/types";
import { ChatMessage } from "./ChatMessage";
import { AVAILABLE_MODELS } from "@/app/lib/openrouter";
import toast from "react-hot-toast";
import {
  Bot,
  User,
  History,
  Settings,
  Plus,
  Trash2,
  Send,
  Clock,
  Zap,
  ChevronDown,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Code,
  FileText,
  FolderOpen,
} from "lucide-react";

interface ChatInterfaceProps {
  initialMessages?: Message[];
}

interface CodeFile {
  filename: string;
  language: string;
  content: string;
  path?: string;
}

export function ChatInterface({ initialMessages = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model>(
    AVAILABLE_MODELS[0],
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [generatedCode, setGeneratedCode] = useState<CodeFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200,
      )}px`;
    }
  }, [input]);

  // Parse code blocks from message content
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && lastMessage.content) {
        parseCodeBlocks(lastMessage.content);
      }
    }
  }, [messages]);

  const parseCodeBlocks = (content: string) => {
    const codeBlocks: CodeFile[] = [];
    const lines = content.split("\n");
    let currentFile: CodeFile | null = null;
    let inCodeBlock = false;
    let currentLanguage = "";

    for (const line of lines) {
      // Check for code block start
      const codeBlockMatch = line.match(/^```(\w+)?/);
      if (codeBlockMatch) {
        if (!inCodeBlock) {
          // Start of code block
          inCodeBlock = true;
          currentLanguage = codeBlockMatch[1] || "text";
          currentFile = {
            filename: `file${codeBlocks.length + 1}.${getFileExtension(currentLanguage)}`,
            language: currentLanguage,
            content: "",
            path: "/src",
          };
        } else {
          // End of code block
          inCodeBlock = false;
          if (currentFile && currentFile.content.trim()) {
            codeBlocks.push(currentFile);
          }
          currentFile = null;
        }
        continue;
      }

      // Check for file path comments (like Claude does)
      const filePathMatch = line.match(/^(\/\/|#)\s*File:\s*(.+)$/);
      if (filePathMatch && !inCodeBlock) {
        if (currentFile && currentFile.content.trim()) {
          codeBlocks.push(currentFile);
        }
        const filename = filePathMatch[2].trim();
        currentLanguage = getLanguageFromFilename(filename);
        currentFile = {
          filename,
          language: currentLanguage,
          content: "",
          path: getPathFromFilename(filename),
        };
        continue;
      }

      // Add content to current file
      if (inCodeBlock && currentFile) {
        currentFile.content += line + "\n";
      }
    }

    // Add last file if exists
    if (currentFile && currentFile.content.trim()) {
      codeBlocks.push(currentFile);
    }

    if (codeBlocks.length > 0) {
      setGeneratedCode(codeBlocks);
      setActiveFileIndex(0);
    }
  };

  const getFileExtension = (language: string): string => {
    const extensions: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      jsx: "jsx",
      tsx: "tsx",
      python: "py",
      java: "java",
      cpp: "cpp",
      c: "c",
      html: "html",
      css: "css",
      json: "json",
      markdown: "md",
      sql: "sql",
      go: "go",
      rust: "rs",
      php: "php",
      ruby: "rb",
      swift: "swift",
      kotlin: "kt",
    };
    return extensions[language] || "txt";
  };

  const getLanguageFromFilename = (filename: string): string => {
    const extension = filename.split(".").pop() || "";
    const languages: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      jsx: "jsx",
      tsx: "tsx",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      sql: "sql",
      go: "go",
      rs: "rust",
      php: "php",
      rb: "ruby",
      swift: "swift",
      kt: "kotlin",
    };
    return languages[extension] || "text";
  };

  const getPathFromFilename = (filename: string): string => {
    if (filename.includes("/")) {
      return filename.split("/").slice(0, -1).join("/");
    }
    return "/src";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setGeneratedCode([]); // Clear previous code

    let assistantMessageId = "";
    let assistantMessage = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          model: selectedModel.id,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      assistantMessageId = (Date.now() + 1).toString();
      const assistantMessageObj: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        model: selectedModel.id,
      };

      setMessages((prev) => [...prev, assistantMessageObj]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Check if we have any leftover buffer content
          if (buffer.trim()) {
            try {
              const data = buffer.trim();
              if (data.startsWith("data: ")) {
                const jsonStr = data.slice(6);
                if (jsonStr === "[DONE]") break;

                const parsed = JSON.parse(jsonStr);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.content) {
                  assistantMessage += parsed.content;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: assistantMessage }
                        : msg,
                    ),
                  );
                  parseCodeBlocks(assistantMessage);
                }
              }
            } catch (parseError) {
              console.error("Error parsing final buffer:", parseError);
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith("data: ")) {
            const data = trimmedLine.slice(6);

            if (data === "[DONE]") {
              // Clean up and return
              buffer = "";
              break;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: assistantMessage }
                      : msg,
                  ),
                );
                // Parse code blocks in real-time
                parseCodeBlocks(assistantMessage);
              }
            } catch (error) {
              console.error("Error parsing stream data:", error, "Data:", data);
              // Don't throw here, continue processing other chunks
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);

      // Remove the loading message if there was an error
      if (assistantMessageId) {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId),
        );
      }

      // Show error as an assistant message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `**Error**: ${error.message || "Failed to get response from AI"}`,
        timestamp: new Date(),
        model: selectedModel.id,
      };

      setMessages((prev) => [...prev, errorMessage]);
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      // Check if we're currently loading
      if (isLoading) {
        toast.error("Please wait for the current response to complete");
        return;
      }

      // Check if input is empty
      if (!input.trim()) {
        toast.error("Please enter a message");
        return;
      }

      handleSubmit(e as any);
    }
  };

  const clearChat = () => {
    if (confirm("Are you sure you want to clear the chat?")) {
      setMessages([]);
      setGeneratedCode([]);
      toast.success("Chat cleared");
    }
  };

  const newChat = () => {
    if (
      messages.length > 0 &&
      !confirm("Start a new chat? Unsaved messages will be lost.")
    ) {
      return;
    }
    setMessages([]);
    setGeneratedCode([]);
    setInput("");
    toast.success("New chat started");
  };

  const downloadAllFiles = () => {
    if (generatedCode.length === 0) return;

    generatedCode.forEach((file) => {
      const blob = new Blob([file.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    toast.success(`Downloaded ${generatedCode.length} files`);
  };

  const copyFileContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Claude Chat
                  </h1>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Model: {selectedModel.name}</span>
                  <span>•</span>
                  <span>{messages.length} messages</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={newChat}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
                <button
                  onClick={clearChat}
                  className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container with Code Preview */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto scroll-smooth"
        >
          <div className="max-w-4xl mx-auto px-4 py-8">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-8 shadow-lg">
                  <Bot className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Hello, I'm Claude
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-12 max-w-xl">
                  An AI assistant created by Anthropic. How can I help you
                  today?
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full">
                  <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/30 transition-colors">
                      <Code className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Code Generation
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Generate complete projects with multiple files
                    </p>
                  </div>
                  <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/30 transition-colors">
                      <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      File Preview
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      View generated code in separate, editable files
                    </p>
                  </div>
                  <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-800/30 transition-colors">
                      <FolderOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Download All
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Download complete projects as zip or individual files
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="py-6 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <ChatMessage message={message} />
                  </div>
                ))}

                {/* Code Files Preview */}
                {generatedCode.length > 0 && (
                  <div className="mt-8 mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <Code className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Generated Files
                        </h3>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          {generatedCode.length} files
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={downloadAllFiles}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <FolderOpen className="w-4 h-4" />
                          Download All
                        </button>
                        <button
                          onClick={() =>
                            copyFileContent(
                              generatedCode[activeFileIndex].content,
                            )
                          }
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          Copy File
                        </button>
                      </div>
                    </div>

                    {/* File Tabs */}
                    <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                      {generatedCode.map((file, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveFileIndex(index)}
                          className={`flex items-center gap-2 px-4 py-3 text-sm border-r border-gray-200 dark:border-gray-800 transition-colors ${
                            activeFileIndex === index
                              ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400"
                              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span className="truncate max-w-[150px]">
                            {file.filename}
                          </span>
                          <span className="px-1.5 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700">
                            {file.language}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Code Editor */}
                    {generatedCode[activeFileIndex] && (
                      <div className="relative">
                        <div className="px-4 py-2 bg-gray-900 text-gray-300 text-sm flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <span className="ml-2">
                              {generatedCode[activeFileIndex].path}/
                              {generatedCode[activeFileIndex].filename}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">
                              {
                                generatedCode[activeFileIndex].content.split(
                                  "\n",
                                ).length
                              }{" "}
                              lines
                            </span>
                            <button
                              onClick={() =>
                                copyFileContent(
                                  generatedCode[activeFileIndex].content,
                                )
                              }
                              className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <pre className="text-sm text-gray-100 bg-gray-900 p-4 m-0">
                            <code
                              className={`language-${generatedCode[activeFileIndex].language}`}
                            >
                              {generatedCode[activeFileIndex].content}
                            </code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isLoading && (
                  <div className="py-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            Claude
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            {selectedModel.name}
                          </span>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            <div
                              className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                              className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full w-3/4 animate-pulse"></div>
                          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full w-1/2 animate-pulse"></div>
                          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full w-2/3 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-4xl mx-auto p-6">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors"
                  onClick={() => {
                    if (generatedCode.length > 0) {
                      downloadAllFiles();
                    } else {
                      toast.error("No files generated yet");
                    }
                  }}
                >
                  <FolderOpen className="w-4 h-4" />
                  Download Code
                </button>
                <div className="flex-1"></div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <select
                    value={selectedModel.id}
                    onChange={(e) =>
                      setSelectedModel(
                        AVAILABLE_MODELS.find((m) => m.id === e.target.value) ||
                          AVAILABLE_MODELS[0],
                      )
                    }
                    className="bg-transparent border-none focus:ring-0 text-gray-700 dark:text-gray-300"
                  >
                    {AVAILABLE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Claude to generate code or explain concepts..."
                  className="w-full px-6 py-4 pr-14 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-0 resize-none min-h-[60px] max-h-[200px] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  rows={1}
                  disabled={isLoading}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className={`p-2 rounded-lg transition-all ${
                      isLoading || !input.trim()
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg"
                    }`}
                    title={isLoading ? "Generating..." : "Send message"}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={(e) =>
                        setTemperature(parseFloat(e.target.value))
                      }
                      className="w-24 accent-blue-500"
                    />
                    <span className="w-10 text-right">
                      {temperature.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <input
                      type="range"
                      min="100"
                      max="4000"
                      step="100"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-32 accent-purple-500"
                    />
                    <span className="w-16 text-right">
                      {maxTokens.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                    Shift + Enter
                  </kbd>
                  <span>for new line</span>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                    Enter
                  </kbd>
                  <span>to send</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
