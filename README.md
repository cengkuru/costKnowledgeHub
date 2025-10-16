# CoST Knowledge Hub

**AI-powered RAG system for infrastructure transparency research**

## Architecture

```
KH/
├── api/              # Node.js + Express backend
│   ├── src/
│   │   ├── config.ts          # Environment configuration
│   │   ├── types.ts           # Shared TypeScript interfaces
│   │   ├── server.ts          # Express app bootstrap
│   │   ├── middlewares/       # Validation, rate limiting, errors
│   │   ├── services/          # Vector search, embeddings, LLM
│   │   └── routes/            # API endpoints
│   ├── package.json
│   └── .env                   # API keys & config
│
└── web/              # Angular 20 frontend
    ├── src/app/
    │   ├── core/              # Services (search, compose, selection)
    │   ├── components/        # UI components
    │   └── app.html           # Main layout
    └── package.json
```

## Tech Stack

### Backend
- **Framework**: Node.js + Express + TypeScript
- **Vector DB**: MongoDB Atlas Vector Search
- **Embeddings**: OpenAI `text-embedding-3-large` (1536 dimensions)
- **LLM**: Google Gemini Flash (answer synthesis with citations)
- **Search**: Exa API (domain-restricted live search)
- **Cache**: LRU Cache (60s TTL)

### Frontend
- **Framework**: Angular 20 (standalone components, signals)
- **Styling**: Tailwind CSS (CoST brand colors)
- **HTTP**: Angular HttpClient with reactive state
- **State**: Angular Signals (zero external state libs)

## Quick Start

### 1. Backend Setup

```bash
cd api

# Dependencies already installed
# If needed: npm install

# Start development server
npm run dev
```

Server runs on **http://localhost:3000**

### 2. Frontend Setup

```bash
cd web

# Install dependencies (if not already done)
npm install

# Start Angular dev server
npm start
```

Frontend runs on **http://localhost:4200**

## API Endpoints

### `GET /health`
Health check
```json
{ "ok": true, "timestamp": "2025-10-15T..." }
```

### `GET /search?q=...&topic=&country=&year=`
**RAG search over indexed corpus**

Query params:
- `q`: Search query (required, min 2 chars)
- `topic`: Document type filter (optional)
- `country`: Country filter (optional)
- `year`: Year filter (optional)

Response:
```json
{
  "answer": [
    {
      "text": "OC4IDS optional stages include...",
      "cites": [
        { "title": "OC4IDS Manual §3.2", "url": "https://..." }
      ]
    }
  ],
  "items": [
    {
      "id": "...",
      "title": "OC4IDS Implementation Manual",
      "type": "Manual",
      "summary": "Comprehensive guide for...",
      "country": "Global",
      "year": 2024,
      "url": "https://..."
    }
  ]
}
```

### `GET /refresh?q=...`
**Live Exa search** (no cache, fresh results)

Returns same format as `/search` but queries live websites within domain allowlist.

### `POST /compose`
**Generate export document**

Request:
```json
{
  "items": ["id1", "id2"],
  "bullets": [{ "text": "...", "cites": [...] }],
  "format": "brief" | "pack" | "notes"
}
```

Response:
```json
{
  "markdown": "# CoST Knowledge Hub Export\n...",
  "title": "CoST-Export-brief-2025-10-15.md"
}
```

## Environment Variables

All configured in `api/.env`:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://...
DB_NAME=infrascope

# AI Services
EXA_SEARCH_API_KEY=...
GEMINI_API_KEY=...
OPENAI_API_KEY=...
OPENAI_EMBEDDING_MODEL=text-embedding-3-large

# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:4200
```

## Frontend Integration

### Services

**SearchService** (`web/src/app/core/search.service.ts`)
```typescript
// RAG search (cached)
searchService.search({ q: 'OC4IDS', topic: 'Manual' }).subscribe(...)

// Live refresh (no cache)
searchService.refresh('latest OC4IDS updates').subscribe(...)

// Reactive state
const answer = searchService.answer(); // Signal<AnswerBullet[]>
const items = searchService.items();   // Signal<ResultItem[]>
```

**SelectionService** (`web/src/app/core/selection.service.ts`)
```typescript
// Add item to basket
selectionService.add(item);

// Check if selected
selectionService.isSelected(item.id); // boolean

// Get all selected
const selected = selectionService.selectedItems(); // Signal<ResultItem[]>
```

**ComposeService** (`web/src/app/core/compose.service.ts`)
```typescript
// Generate export
composeService.compose({
  items: selectionService.getSelectedIds(),
  bullets: searchService.answer(),
  format: 'brief'
}).subscribe(({ markdown, title }) => {
  composeService.downloadMarkdown(markdown, title);
});
```

## Key Features

### 1. Citation-Driven Answers
- Every bullet **must** cite at least one source
- Gemini Flash parses `[#N]` references and maps to URLs
- Frontend renders citations as clickable badges

### 2. Domain Safety
- Exa searches restricted to:
  - `infrastructuretransparency.org`
  - `infrastructuretransparencyinitiative.org`
- Double-filtering (API + client-side)

### 3. Smart Caching
- `/search`: 60s LRU cache (fast responses)
- `/refresh`: No cache (intentionally fresh)

### 4. Metadata Filtering
- Type (Manual, Template, Assurance Report, etc.)
- Country (Uganda, Kenya, etc.)
- Year (2023, 2024, etc.)

## MongoDB Atlas Vector Index

**Required index**: `embedding_index`

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "type"
    },
    {
      "type": "filter",
      "path": "country"
    },
    {
      "type": "filter",
      "path": "year"
    }
  ]
}
```

Create this index in MongoDB Atlas UI before running searches.

## Development Workflow

### Terminal 1: Backend
```bash
cd api
npm run dev
```

### Terminal 2: Frontend
```bash
cd web
npm start
```

### Testing
1. Open http://localhost:4200
2. Type a query (e.g., "OC4IDS optional stages")
3. View answer with citations
4. Add items to selection basket
5. Export as Markdown

## Next Steps

### 1. Data Ingestion
Create a crawler to populate MongoDB with document chunks:
- Scrape CoST & ITI domains
- Chunk by heading/section
- Generate embeddings
- Upsert to `docs` collection

### 2. Enhanced UI
Wire existing Angular components to services:
- Search bar → `searchService.search()`
- Answer block → Display `answer()` signal
- Results list → Display `items()` signal
- Selection basket → `selectionService` integration
- Export button → `composeService.compose()`

### 3. Production
- Deploy backend to Cloud Run / Railway / Fly.io
- Deploy frontend to Firebase Hosting / Vercel
- Add Redis for distributed caching
- Set up monitoring (Sentry, LogRocket)

## Architecture Decisions

### Why MongoDB Atlas Vector Search?
- Native vector search (no separate vector DB)
- Metadata filtering built-in
- Familiar MongoDB query syntax
- Auto-scaling

### Why Gemini Flash over GPT-4?
- 10x faster
- 10x cheaper
- Sufficient quality for bullet synthesis
- Better at following citation format

### Why Exa over Perplexity?
- Domain allowlist support
- Deterministic results (no fuzzy mode)
- Explicit content retrieval options
- Better for compliance-sensitive research

### Why Signals over RxJS?
- Simpler mental model
- Better performance (fine-grained reactivity)
- Native Angular (no external deps)
- Future-proof (Angular's direction)

## Troubleshooting

### Backend won't start
```bash
# Check .env file exists
ls api/.env

# Verify all required keys are set
grep -E "MONGODB_URI|GEMINI_API_KEY|OPENAI_API_KEY|EXA_SEARCH_API_KEY" api/.env
```

### Frontend can't reach backend
```bash
# Check CORS is allowing localhost:4200
grep ALLOWED_ORIGINS api/.env

# Should include: http://localhost:4200
```

### Vector search returns no results
```bash
# Verify index exists in MongoDB Atlas
# Index name must be: embedding_index
# Vector dimension must be: 1536
```

## License

MIT

---

Built with care for infrastructure transparency 🏗️
