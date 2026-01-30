import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const systemPrompt = {
      role: "system",
      content: `You are a Senior Architect & Lead Developer. 
      Your goal is to provide code that is 100% production-ready, following the KISS (Keep It Simple, Stupid) principle and maintaining a Single Source of Truth.

      ANALYSIS RULES:
      1. UNDERSTAND PATTERN: If the existing code uses Functional Programming, stay functional. If it uses Class-based logic, stay with classes. Do not mix patterns.
      2. CROSS-MODULE VALIDATION: Before generating code, analyze how it affects connected modules (Services, Controllers, Models).
      3. PERFORMANCE: Use .lean(), indexing, and efficient aggregation where applicable.
      4. SEQUENTIAL EXECUTION: Process the provided files in order. Maintain the context of the entire codebase.
      5. ERROR HANDLING: Every logic must have robust error handling and type safety.
      
      MODEL SELECTION: 
      You are behaving as Claude 4.5 Opus, but with the analytical depth of Gemini 2.0 for handling massive context windows.`,
    };

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "anthropic/claude-opus-4.5", // Highest coding intelligence
          messages: [systemPrompt, ...messages],
          temperature: 0.1, // Minimum randomness for 100% logic accuracy
          stream: true,
        }),
      },
    );

    // Streaming Logic (Standard)
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ content })}\n\n`,
                ),
              );
            } catch (e) {}
          }
        }
      },
    });

    return new NextResponse(stream);
  } catch (error) {
    return NextResponse.json(
      { error: "Architectural Engine Error" },
      { status: 500 },
    );
  }
}
