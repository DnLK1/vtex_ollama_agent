/**
 * Direct REST API client for ChromaDB.
 * Supports both local ChromaDB and Chroma Cloud.
 * Uses ChromaDB v2 API.
 */

import type {
  ChromaCollection,
  DocToUpsert,
  QueryResult,
  CollectionStats,
} from "@/types";
import { getEmbedding, getEmbeddings } from "./embeddings";

export type { DocToUpsert, QueryResult };

const CHROMA_HOST = process.env.CHROMA_HOST || "http://localhost:8000";
const CHROMA_API_KEY = process.env.CHROMA_API_KEY || "";
const CHROMA_TENANT = process.env.CHROMA_TENANT || "default_tenant";
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || "default_database";
const COLLECTION_NAME = "docs";

const CHROMA_API_BASE = `${CHROMA_HOST}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}`;

/**
 * Gets headers for Chroma API requests.
 * Includes auth token for Chroma Cloud.
 */
function getChromaHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (CHROMA_API_KEY) {
    headers["X-Chroma-Token"] = CHROMA_API_KEY;
  }
  return headers;
}

/**
 * Removes lone UTF-16 surrogates that break JSON serialization.
 * Keeps valid surrogate pairs (high + low) intact.
 * @param text The text to sanitize.
 * @returns Sanitized text safe for JSON.stringify.
 */
function sanitizeText(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const nextCode = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        result += text[i] + text[i + 1];
        i++;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
    } else {
      result += text[i];
    }
  }
  return result;
}

let cachedCollectionId: string | null = null;

async function getOrCreateCollection(): Promise<string> {
  if (cachedCollectionId) return cachedCollectionId;

  const listRes = await fetch(`${CHROMA_API_BASE}/collections`, {
    headers: getChromaHeaders(),
  });
  if (!listRes.ok)
    throw new Error(`Failed to list collections: ${listRes.status}`);

  const collections: ChromaCollection[] = await listRes.json();
  const existing = collections.find(
    (collection) => collection.name === COLLECTION_NAME
  );
  if (existing) {
    cachedCollectionId = existing.id;
    return existing.id;
  }

  const createRes = await fetch(`${CHROMA_API_BASE}/collections`, {
    method: "POST",
    headers: getChromaHeaders(),
    body: JSON.stringify({
      name: COLLECTION_NAME,
      metadata: { description: "Documentation embeddings for RAG" },
    }),
  });

  if (!createRes.ok)
    throw new Error(`Failed to create collection: ${createRes.status}`);

  const created: ChromaCollection = await createRes.json();
  cachedCollectionId = created.id;
  return created.id;
}

export async function upsertDocsBatch(docs: DocToUpsert[]): Promise<number> {
  if (docs.length === 0) return 0;

  const collectionId = await getOrCreateCollection();

  const sanitizedDocs = docs.map((doc) => ({
    ...doc,
    text: sanitizeText(doc.text),
  }));

  const embeddings = await getEmbeddings(sanitizedDocs.map((doc) => doc.text));

  const upsertRes = await fetch(
    `${CHROMA_API_BASE}/collections/${collectionId}/upsert`,
    {
      method: "POST",
      headers: getChromaHeaders(),
      body: JSON.stringify({
        ids: sanitizedDocs.map((doc) => doc.id),
        documents: sanitizedDocs.map((doc) => doc.text),
        embeddings,
        metadatas: sanitizedDocs.map((doc) => ({
          source: doc.source || "",
          url: doc.url || "",
        })),
      }),
    }
  );

  if (!upsertRes.ok) {
    const errorText = await upsertRes.text();
    throw new Error(
      `ChromaDB upsert failed: ${upsertRes.status} - ${errorText}`
    );
  }

  return docs.length;
}

export async function getCollectionStatsRest(): Promise<CollectionStats> {
  const listRes = await fetch(`${CHROMA_API_BASE}/collections`, {
    headers: getChromaHeaders(),
  });
  if (!listRes.ok) return { count: 0, name: COLLECTION_NAME };

  const collections: ChromaCollection[] = await listRes.json();
  const existing = collections.find(
    (collection) => collection.name === COLLECTION_NAME
  );
  if (!existing) return { count: 0, name: COLLECTION_NAME };

  const countRes = await fetch(
    `${CHROMA_API_BASE}/collections/${existing.id}/count`,
    { headers: getChromaHeaders() }
  );
  if (!countRes.ok) return { count: 0, name: COLLECTION_NAME };

  const count: number = await countRes.json();
  return { count, name: COLLECTION_NAME };
}

export async function queryDocs(
  query: string,
  topK = 8
): Promise<QueryResult[]> {
  const collectionId = await getOrCreateCollection();
  const queryEmbedding = await getEmbedding(query);

  const queryRes = await fetch(
    `${CHROMA_API_BASE}/collections/${collectionId}/query`,
    {
      method: "POST",
      headers: getChromaHeaders(),
      body: JSON.stringify({
        query_embeddings: [queryEmbedding],
        n_results: topK,
        include: ["documents", "metadatas", "distances"],
      }),
    }
  );

  if (!queryRes.ok) return [];

  const results = await queryRes.json();
  if (!results.documents?.[0]) return [];

  return results.documents[0].map((text: string, i: number) => {
    const distance = results.distances?.[0]?.[i] ?? 1;
    const score = 1 / (1 + distance);
    return {
      text: text || "",
      source: results.metadatas?.[0]?.[i]?.source as string | undefined,
      url: results.metadatas?.[0]?.[i]?.url as string | undefined,
      score,
    };
  });
}

export const upsertDocs = upsertDocsBatch;
export const getCollectionStats = getCollectionStatsRest;
