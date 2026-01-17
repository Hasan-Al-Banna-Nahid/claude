// lib/openrouter.ts
import { ChatRequest, ChatResponse } from "@/app/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const AVAILABLE_MODELS = [
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    context: 200000,
    description: "Latest Claude model – fast, strong reasoning",
    pricing: { input: 3, output: 15 },
  },
  {
    id: "anthropic/claude-3.5-opus",
    name: "Claude 3.5 Opus",
    provider: "Anthropic",
    context: 200000,
    description: "Most capable Claude model",
    pricing: { input: 15, output: 75 },
  },
  {
    id: "anthropic/claude-3-sonnet",
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    context: 200000,
    description: "Balanced Claude model",
    pricing: { input: 3, output: 15 },
  },
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    context: 128000,
    description: "Latest GPT-4.1 model",
    pricing: { input: 10, output: 30 },
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    provider: "Meta",
    context: 131072,
    description: "Open-source Meta model",
    pricing: { input: 0.59, output: 0.79 },
  },
];

export async function chatCompletion(
  request: ChatRequest,
  apiKey: string,
): Promise<ChatResponse> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
      "X-Title": "Claude Chat Assistant",
    },
    body: JSON.stringify({
      ...request,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  return response.json();
}

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
    body: JSON.stringify({
      ...request,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((line) => line.trim() !== "");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch (error) {
          console.error("Error parsing streaming chunk:", error);
        }
      }
    }
  }
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelId: string,
): number {
  const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1000000) * model.pricing.input;
  const outputCost = (outputTokens / 1000000) * model.pricing.output;

  return inputCost + outputCost;
}
