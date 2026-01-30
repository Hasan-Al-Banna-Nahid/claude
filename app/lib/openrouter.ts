// lib/openrouter.ts
import { ChatRequest, ChatResponse } from "@/app/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const AVAILABLE_MODELS = [
  {
    id: "anthropic/claude-opus-4.5", // Canonical ID
    name: "Claude 4.5 Opus",
    provider: "Anthropic",
    context: 200000,
    pricing: { input: 5, output: 25 },
  },
];

export async function* streamChatCompletion(
  request: ChatRequest,
  apiKey: string,
): AsyncGenerator<string> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Claude Chat Assistant",
    },
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter Error: ${error}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter((line) => line.trim() !== "");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {
          // Ignore partial JSON chunks
        }
      }
    }
  }
}
