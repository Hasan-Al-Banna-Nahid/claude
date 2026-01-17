// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatRequest, ChatResponse } from "@/app/types";
import { chatCompletion, streamChatCompletion } from "@/app/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model: string;
  stream?: boolean;
  stop?: boolean; // optional stop flag for future use
  temperature?: number;
  top_p?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { messages, model, stream = true, ...options } = body;
    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 },
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    if (stream) {
      const encoder = new TextEncoder();

      // SSE Stream for client-side
      const sseStream = new ReadableStream({
        async start(controller) {
          try {
            const generator = streamChatCompletion(
              { messages, model, ...options },
              apiKey,
            );

            for await (const token of generator) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: token })}\n\n`,
                ),
              );
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error: any) {
            console.error("Streaming error:", error);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: error.message || "Streaming failed" })}\n\n`,
              ),
            );
            controller.close();
          }
        },

        cancel() {
          console.log("Client closed the stream.");
        },
      });

      return new Response(sseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } else {
      // Non-streaming mode for full completion
      const response: ChatResponse = await chatCompletion(
        { messages, model, ...options },
        apiKey,
      );
      return NextResponse.json(response);
    }
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
