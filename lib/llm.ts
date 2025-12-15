/**
 * LLM provider using Ollama.
 */

import type { ApiMessage } from "@/types";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

interface LLMResponse {
  content: string;
}

interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: () => void;
}

/**
 * Calls Ollama with the given messages (non-streaming).
 */
export async function chatCompletion(
  messages: ApiMessage[],
  model?: string
): Promise<LLMResponse> {
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || OLLAMA_MODEL,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Ollama error: ${response.status} - ${errorText}`);
  }

  const json = await response.json();
  return { content: json.message.content };
}

/**
 * Streams Ollama response with callbacks.
 */
export async function chatCompletionStream(
  messages: ApiMessage[],
  callbacks: StreamCallbacks,
  model?: string
): Promise<void> {
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || OLLAMA_MODEL,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Ollama stream error: ${response.status} - ${errorText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        const chunk = json.message?.content ?? "";
        if (chunk) callbacks.onChunk(chunk);
      } catch {
        // Skip malformed JSON
      }
    }
  }

  callbacks.onDone();
}

export function getDefaultModel(): string {
  return OLLAMA_MODEL;
}

export function getProvider(): string {
  return "ollama";
}
