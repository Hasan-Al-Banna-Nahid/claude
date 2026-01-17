// app/page.tsx
"use client";

import { ChatInterface } from "@/app/components/Chat/ChatInterface";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function Home() {
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
      toast.error(
        <div>
          OpenRouter API key not configured. Please add it to your environment
          variables.
          <br />
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Get your API key here
          </a>
        </div>,
        { duration: 10000 },
      );
    } else {
      setIsApiKeyConfigured(true);
    }
  }, []);

  if (!isApiKeyConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.795-.833-2.565 0L4.232 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            API Key Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            To use Claude Chat, you need to configure your OpenRouter API key.
          </p>
          <div className="space-y-4">
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Get OpenRouter API Key
            </a>
            <p className="text-sm text-gray-500">
              1. Sign up at OpenRouter.ai
              <br />
              2. Get your API key
              <br />
              3. Add to .env.local as OPENROUTER_API_KEY
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <ChatInterface />;
}
