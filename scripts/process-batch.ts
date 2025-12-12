#!/usr/bin/env tsx
/**
 * Child process script that processes a single batch file.
 * Spawned by ingest-sitemap.ts to ensure memory isolation.
 * Uses direct REST API to avoid chromadb-js V8 crashes.
 *
 * Outputs JSON with processed count, chunks added, and cache entries
 * for the parent to aggregate and save.
 *
 * Usage: tsx scripts/process-batch.ts <batchFile> <configName>
 */

import fs from "fs";
import { upsertDocsBatch, DocToUpsert } from "../lib/chroma-rest";
import { createChunkDocs } from "../lib/chunking";

const UPSERT_BATCH_SIZE = 20;

interface ExtractedEntry {
  url: string;
  hash: string;
  text: string;
  lastmod?: string;
}

interface CacheEntryOutput {
  url: string;
  hash: string;
  lastmod?: string;
}

interface ProcessResult {
  processed: number;
  chunksAdded: number;
  cacheEntries: CacheEntryOutput[];
  error?: string;
}

async function processBatchFile(
  batchFile: string,
  configName: string
): Promise<ProcessResult> {
  const content = fs.readFileSync(batchFile, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);

  let processed = 0;
  let chunksAdded = 0;
  let pendingDocs: DocToUpsert[] = [];
  const cacheEntries: CacheEntryOutput[] = [];

  for (const line of lines) {
    try {
      const entry: ExtractedEntry = JSON.parse(line);
      const urlPath = new URL(entry.url).pathname;

      const chunks = createChunkDocs(entry.text, {
        idPrefix: "sitemap",
        url: entry.url,
        source: `${configName} - ${urlPath}`,
      });

      for (const chunk of chunks) {
        pendingDocs.push({
          id: chunk.id,
          text: chunk.text,
          source: chunk.source,
          url: chunk.url,
        });

        if (pendingDocs.length >= UPSERT_BATCH_SIZE) {
          await upsertDocsBatch(pendingDocs);
          chunksAdded += pendingDocs.length;
          pendingDocs = [];
        }
      }

      cacheEntries.push({
        url: entry.url,
        hash: entry.hash,
        lastmod: entry.lastmod,
      });
      processed++;
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (pendingDocs.length > 0) {
    await upsertDocsBatch(pendingDocs);
    chunksAdded += pendingDocs.length;
  }

  const donePath = batchFile.replace(/\.jsonl$/, ".done.jsonl");
  fs.renameSync(batchFile, donePath);

  return { processed, chunksAdded, cacheEntries };
}

async function main(): Promise<void> {
  const [batchFile, configName] = process.argv.slice(2);

  if (!batchFile || !configName) {
    console.error(
      "Usage: tsx scripts/process-batch.ts <batchFile> <configName>"
    );
    process.exit(1);
  }

  if (!fs.existsSync(batchFile)) {
    console.error(`Batch file not found: ${batchFile}`);
    process.exit(1);
  }

  try {
    const result = await processBatchFile(batchFile, configName);
    console.log(JSON.stringify(result));
    process.exit(0);
  } catch (error) {
    console.log(
      JSON.stringify({
        processed: 0,
        chunksAdded: 0,
        cacheEntries: [],
        error: error instanceof Error ? error.message : String(error),
      })
    );
    process.exit(1);
  }
}

main();
