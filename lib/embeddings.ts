/**
 * Embedding provider using Ollama.
 */

import type { OllamaEmbeddingResponse } from "@/types";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_EMBEDDING_MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL || "mxbai-embed-large";

/**
 * Gets an embedding vector for the given text using Ollama.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_EMBEDDING_MODEL, prompt: text }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Ollama embedding failed: ${response.status} - ${errorText}`);
  }

  const data: OllamaEmbeddingResponse = await response.json();
  return data.embedding;
}

/**
 * Gets embeddings for multiple texts.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await getEmbedding(text));
  }
  return embeddings;
}

export function getEmbeddingProvider(): string {
  return "ollama";
}
