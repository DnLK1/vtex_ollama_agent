# VTEX Docs Agent

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-blue)](https://ollama.ai/)

A local RAG (Retrieval Augmented Generation) agent that answers questions using documentation. Runs entirely on your machine with Ollama + ChromaDB.

![Chat Interface](https://img.shields.io/badge/UI-Themed%20Chat-purple)

## ✨ Features

- **🏠 Local-first** - Runs entirely on your machine, no cloud dependencies
- **🎨 Beautiful UI** - Multiple themes with animated background effects
- **📚 Flexible ingestion** - Sitemaps, URLs, OpenAPI schemas, or manual docs
- **⚡ Fast** - GPU-accelerated embeddings with Ollama
- **🐳 Docker ready** - One-command setup with Docker Compose

## Quick Start

### Development Mode (Recommended)

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment config
cp .env.example .env

# 3. Start Chroma (vector DB)
docker compose up chroma -d

# 4. Start Ollama (if not already running)
ollama serve

# 5. Pull models
ollama pull qwen2.5:7b
ollama pull mxbai-embed-large

# 6. Ingest documentation
pnpm chroma:sync

# 7. Run the app
pnpm dev
```

### Docker Mode (Full Stack)

**One command setup:**

```bash
# Install dependencies and run everything
pnpm install
pnpm docker:setup
```

This single command will:

1. Start Chroma + Ollama containers
2. Wait for services to be ready
3. Pull required models
4. Ingest all documentation
5. Build and start the app

**Manual setup (step by step):**

```bash
# 1. Install dependencies
pnpm install

# 2. Start Chroma + Ollama ONLY (not the app yet)
pnpm docker:services

# 3. Pull models INSIDE the Ollama container
pnpm docker:ollama:pull

# 4. Ingest documentation (runs on host, connects to Docker services on localhost)
pnpm chroma:sync

# 5. NOW build and start the app
pnpm docker:app
```

> **⚠️ Important**: The order matters! You MUST ingest data BEFORE starting the app container. The app connects to Chroma via Docker's internal network (`http://chroma:8000`), which uses the same persistent volume as localhost ingestion.

> **Note**: In Docker mode, use `docker:ollama:pull` instead of `ollama:pull` since Ollama runs inside Docker. The `chroma:fresh` command works from host because Docker exposes ChromaDB (port 8000) and Ollama (port 11434) to localhost.

### Ports

| Service | Internal (Docker) | External (localhost) |
| ------- | ----------------- | -------------------- |
| App     | 3002              | 3002                 |
| Chroma  | 8000              | 8000                 |
| Ollama  | 11434             | 11434                |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Next.js    │────▶│   Chroma    │────▶│   Ollama    │
│  Frontend   │     │  (vectors)  │     │  (LLM)      │
└─────────────┘     └─────────────┘     └─────────────┘
```

- **Ollama** - Local LLM (qwen2.5:7b) + embeddings (mxbai-embed-large)
- **Chroma** - Vector database for semantic search (v2 REST API)
- **Next.js** - Frontend + API

## Project Structure

```
vtex-agent/
├── app/
│   ├── api/
│   │   ├── ask/route.ts        # RAG API endpoint
│   │   └── health/route.ts     # Health check
│   ├── components/
│   │   ├── chat/               # Chat UI components
│   │   └── themes/             # Animated background effects
│   └── page.tsx                # Chat UI
├── lib/
│   ├── chroma-rest.ts          # Direct REST API client (ChromaDB)
│   ├── embeddings.ts           # Ollama embeddings
│   ├── llm.ts                  # Ollama LLM client
│   ├── cache.ts                # Disk-based caching utilities
│   ├── chunking.ts             # Text chunking with overlap
│   ├── content.ts              # HTML content extraction
│   ├── fetcher.ts              # Concurrent HTTP fetching
│   └── constants.ts            # App constants
├── hooks/
│   ├── useChat.ts              # Chat state management
│   ├── useCanvasAnimation.ts   # Animation hook for themes
│   └── useReducedMotion.ts     # Accessibility hook
├── types/                      # TypeScript types
├── data/
│   ├── aliases.json            # Query expansion aliases
│   ├── manual-docs.json        # Curated documentation
│   ├── urls.json               # URLs to scrape
│   ├── openapi-config.json     # OpenAPI ingestion config
│   └── sitemap-config.json     # Sitemap ingestion config
├── scripts/
│   ├── countdown.ts            # Pre-ingestion countdown
│   ├── ingest-manual.ts        # Ingest manual-docs.json
│   ├── ingest-urls.ts          # Scrape & ingest URLs
│   ├── ingest-openapi.ts       # Fetch & ingest OpenAPI schemas
│   ├── ingest-sitemap.ts       # Crawl & ingest sitemaps
│   ├── process-batch.ts        # Child process for batch processing
│   ├── chroma-inspect.ts       # View stored docs
│   └── chroma-reset.ts         # Clear database
└── docker-compose.yml          # Chroma + Ollama services
```

## Adding Documentation

### Option 1: Manual docs (best quality)

Edit `data/manual-docs.json`:

```json
[
  {
    "topic": "Extension Points",
    "text": "FastStore Checkout provides extension points for customization...",
    "url": "https://docs.example.com/extension-points"
  }
]
```

### Option 2: URL scraping

Edit `data/urls.json`:

```json
[
  {
    "url": "https://docs.example.com/page",
    "name": "Page Name",
    "selector": ".content"
  }
]
```

Supports multiple CSS selectors for content extraction.

### Option 3: Sitemap crawling (recommended for large sites)

Edit `data/sitemap-config.json`:

```json
[
  {
    "url": "https://developers.vtex.com/sitemap-0.xml",
    "name": "VTEX Developer Guides",
    "include": ["/docs/*", "/updates/*"],
    "exclude": ["/editor/*", "/search"],
    "selector": [".css-iourwr", ".css-89s28c"]
  }
]
```

Features:

- Glob pattern matching for URL filtering
- Multiple CSS selectors for content extraction
- Parallel downloading with rate limiting
- Two-phase processing (download → process) for memory efficiency
- Disk-based caching with 7-day TTL
- Resume capability with `--process-only` flag

### Option 4: OpenAPI schemas

Edit `data/openapi-config.json`:

```json
{
  "githubRepo": "vtex/openapi-schemas",
  "branch": "master",
  "filePrefix": "VTEX -",
  "docsBaseUrl": "https://developers.vtex.com/docs/api-reference"
}
```

### Testing contexts

Use the "Duck Rule" to check if contexts are being applied correctly.

- Ask **"What about ducks?"** and the agent should respond with **"quack quack"**
- If it doesn't, contexts are NOT working correctly

## Scripts

### Docker Commands

| Script                    | Description                                      |
| ------------------------- | ------------------------------------------------ |
| `pnpm docker:setup`       | **Full setup**: services → models → ingest → app |
| `pnpm docker:reingest`    | Stop app, re-ingest data, restart app            |
| `pnpm docker:services`    | Start only Chroma + Ollama (not the app)         |
| `pnpm docker:app`         | Build and start the app container                |
| `pnpm docker:app:restart` | Restart the app container                        |
| `pnpm docker:up`          | Start all containers                             |
| `pnpm docker:down`        | Stop all containers                              |
| `pnpm docker:ollama:pull` | Pull models inside Docker Ollama container       |

### Development Commands

| Script       | Description                               |
| ------------ | ----------------------------------------- |
| `pnpm dev`   | Start development server (localhost:3000) |
| `pnpm build` | Build for production                      |
| `pnpm start` | Start production server                   |

### Ingestion Commands

| Script                        | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| `pnpm chroma:sync`            | Ingest all docs (urls + openapi + sitemap + manual) |
| `pnpm chroma:fresh`           | Reset database and re-ingest everything             |
| `pnpm chroma:reset`           | Clear all data from Chroma                          |
| `pnpm chroma:inspect`         | View stored documents                               |
| `pnpm chroma:inspect "query"` | Search documents                                    |
| `pnpm ingest:manual`          | Ingest manual-docs.json                             |
| `pnpm ingest:urls`            | Scrape and ingest urls.json                         |
| `pnpm ingest:openapi`         | Fetch and ingest OpenAPI schemas                    |
| `pnpm ingest:sitemap`         | Crawl and ingest sitemaps                           |

### Local Ollama Commands

| Script              | Description                         |
| ------------------- | ----------------------------------- |
| `pnpm ollama:start` | Start Ollama server locally         |
| `pnpm ollama:pull`  | Pull required models (local Ollama) |

## Environment Variables

| Variable                 | Default                  | Description                  |
| ------------------------ | ------------------------ | ---------------------------- |
| `OLLAMA_HOST`            | `http://localhost:11434` | Ollama API URL               |
| `OLLAMA_MODEL`           | `qwen2.5:7b`             | Chat model                   |
| `OLLAMA_EMBEDDING_MODEL` | `mxbai-embed-large`      | Embedding model              |
| `CHROMA_HOST`            | `http://localhost:8000`  | ChromaDB API URL             |
| `CHROMA_API_KEY`         | -                        | Chroma Cloud API key         |
| `CHROMA_TENANT`          | `default_tenant`         | Chroma Cloud tenant          |
| `CHROMA_DATABASE`        | `default_database`       | Chroma Cloud database        |

## UI Themes

The chat interface includes multiple themes with optional animated effects:

### Simple Themes
| Theme | Description |
|-------|-------------|
| Grey | Clean dark grey (default) |
| Gruvbox | Warm retro colors |
| Nord | Arctic, bluish tones |
| Tokyo | Purple-tinted night |
| Catppuccin | Pastel Mocha |
| Solarized Light | Warm light theme |
| GitHub Light | Clean light theme |

### Animated Themes
| Theme | Effect |
|-------|--------|
| Matrix | Falling green code rain |
| Winter | Gentle falling snow |
| Space | Hyperspace warp stars |
| Night Sky | Twinkling stars |
| Synthwave | Retro 80s grid |
| Ocean | Floating bubbles |
| Cyberpunk | Neon rain city |
| Sakura | Falling cherry blossoms |

> **Note**: Animated effects can be toggled on/off per theme. They respect `prefers-reduced-motion` for accessibility.

## How It Works

1. **Ingestion**: Documents are chunked, embedded via Ollama, and stored in Chroma
2. **Query**: User question is embedded and matched against stored docs
3. **RAG**: Top matches are injected into the LLM prompt as context
4. **Response**: LLM generates answer grounded in the documentation
5. **Sources**: Relevant sources shown (filtered by relative score threshold)

## Technical Details

### Shared Libraries

All ingestion scripts share common utilities:

| Library              | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `lib/chroma-rest.ts` | Direct REST API calls to ChromaDB and Ollama |
| `lib/embeddings.ts`  | Embedding generation via Ollama              |
| `lib/llm.ts`         | Chat completion via Ollama                   |
| `lib/cache.ts`       | Disk-based caching with TTL                  |
| `lib/chunking.ts`    | Sentence-aware text chunking with overlap    |
| `lib/content.ts`     | HTML content extraction with Cheerio         |
| `lib/fetcher.ts`     | Concurrent HTTP fetching with retries        |

### Performance Optimizations

- **Batch embeddings**: Documents upserted in batches of 20
- **Parallel processing**: Multiple batch files processed concurrently
- **Memory isolation**: Large batch processing in child processes
- **Collection caching**: Collection ID cached to avoid repeated lookups
- **Relative source filtering**: Only shows sources within 70% of top result's score
- **Animation throttling**: Canvas effects use `requestAnimationFrame` with FPS limits

## GPU Support

GPU acceleration is **enabled by default** in `docker-compose.yml` for much faster embeddings.

### Requirements

```bash
# Arch Linux - install nvidia-container-toolkit
sudo pacman -S nvidia-container-toolkit
sudo systemctl restart docker

# Or use the official Ollama installer (auto-detects GPU)
curl -fsSL https://ollama.com/install.sh | sh
```

### Verify GPU is being used

```bash
# Check Ollama is using GPU
ollama ps
# Should show "100% GPU" instead of "100% CPU"

# Monitor GPU usage
nvidia-smi
```

### Models

| Model               | Purpose    | Size  |
| ------------------- | ---------- | ----- |
| `qwen2.5:7b`        | Chat/LLM   | 4.7GB |
| `mxbai-embed-large` | Embeddings | 670MB |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
