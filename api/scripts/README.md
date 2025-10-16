# CoST Knowledge Hub - Data Seeding Pipeline

This pipeline crawls real CoST websites, processes content, generates embeddings, and populates MongoDB with searchable knowledge base.

## Architecture Overview

```
┌─────────────────┐
│  CoST Websites  │  (Real data sources)
└────────┬────────┘
         │ Crawl
         ▼
┌─────────────────┐
│  Web Crawler    │  (crawler.ts)
│  - HTML fetch   │
│  - Text extract │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Text Chunker   │  (chunker.ts)
│  - Smart split  │
│  - Preserve ctx │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Embedder       │  (embedder.ts)
│  - OpenAI API   │
│  - Batch process│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MongoDB Atlas  │
│  - Vector store │
│  - Full-text    │
└─────────────────┘
```

## Prerequisites

### 1. MongoDB Atlas Setup

**Create Vector Search Index:**

1. Go to https://cloud.mongodb.com
2. Navigate to your cluster → Atlas Search
3. Create new index with this config:

```json
{
  "name": "embedding_index",
  "type": "vectorSearch",
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

4. Wait for index to become "Active" (1-5 minutes)

See `VECTOR_INDEX_SETUP.md` for detailed instructions.

### 2. Environment Variables

Ensure your `api/.env` file has:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=infrascope

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-large

# Gemini (for answer synthesis)
GEMINI_API_KEY=...

# Exa (for live search)
EXA_SEARCH_API_KEY=...
```

## Usage

### Quick Test (3 Resources)

Perfect for testing the pipeline quickly:

```bash
cd api
npm run seed:quick
```

**Expected output:**
- Crawls first 3 resources (~30 seconds)
- Creates ~10-20 chunks
- Generates embeddings (~$0.001)
- Inserts into MongoDB

### Full Seed (All Resources)

Complete knowledge base with all configured resources:

```bash
cd api
npm run seed
```

**Expected output:**
- Crawls 7+ resources (~2 minutes)
- Creates ~50-100 chunks
- Generates embeddings (~$0.003-0.005)
- Inserts into MongoDB

### Discover & Index Entire infrastructuretransparency.org

Use the discovery crawler to enumerate every public page (sitemap + link crawl), then seed all fresh content in parallel:

```bash
cd api
# Generate resource list (adjust limits as needed)
npm run discover:cost -- --max-pages 400 --max-depth 3

# Optional: write to a temporary file for review
npm run discover:cost -- --output scripts/resources/cost-site-preview.ts -- --max-pages 50

# Seed newly discovered pages (skips URLs already present in MongoDB)
npm run seed:discovered
```

Discovery flags:
- `--max-pages <n>`: limit total pages queued (default 400)
- `--max-depth <n>`: traversal depth for link crawling (default 3)
- `--no-sitemap`: disable sitemap bootstrap if a site blocks access
- `--sitemap=<url>`: manually supply sitemap URLs (repeatable)
- `--output <file>`: direct discovered resources to a custom path

Tip: run `npm run db:vector-index` to print the Atlas JSON config when setting up the required `embedding_index`.

### What Gets Seeded

Current resources (see `utils/crawler.ts`):

1. **OC4IDS Standard** - Official documentation
2. **OC4IDS Implementation Guide** - Practical guidance
3. **OC4IDS Schema Reference** - Technical reference
4. **CoST Approach** - Methodology overview
5. **CoST Resource Library** - Templates and guides
6. **Impact Stories** - Real-world examples
7. **Project Disclosure Template** - Standard templates

## Verifying Success

### 1. Check MongoDB

```bash
# Connect via MongoDB Shell
mongosh "mongodb+srv://cluster.mongodb.net/infrascope"

# Count documents
db.docs.countDocuments()
# Should show 50-100 documents

# Check sample document
db.docs.findOne()
# Should have: title, type, content, embedding, url, metadata
```

### 2. Test Search Endpoint

```bash
# Start API server
npm run dev

# Test simple search
curl "http://localhost:3000/search?q=OC4IDS"

# Should return results with:
# - Relevant documents
# - Similarity scores
# - Synthesized answer
```

### 3. Test Specific Queries

```bash
# Impact Stories
curl "http://localhost:3000/search?q=Impact%20Stories"

# Implementation guidance
curl "http://localhost:3000/search?q=implementation%20guide"

# Templates
curl "http://localhost:3000/search?q=project%20disclosure%20template"
```

## File Structure

```
api/scripts/
├── README.md                    # This file
├── VECTOR_INDEX_SETUP.md        # MongoDB index setup guide
├── seed.ts                      # Main seeder script
└── utils/
    ├── crawler.ts               # Web crawler
    ├── chunker.ts               # Text chunking
    └── embedder.ts              # Embedding generation
```

## Customization

### Adding New Resources

Edit `utils/crawler.ts` and add to `COST_RESOURCES` array:

```typescript
{
  url: 'https://example.com/document',
  title: 'Document Title',
  type: 'Manual', // or 'Template', 'Guide', 'Impact Story', etc.
  summary: 'Brief description',
  country: 'Uganda', // optional
  year: 2024         // optional
}
```

### Adjusting Chunk Size

Edit `seed.ts` and modify chunking options:

```typescript
const chunks = chunkText(doc.content, {
  maxTokens: 512,    // Increase for larger chunks
  overlap: 50,       // Increase for more context
  preserveContext: true
});
```

### Changing Embedding Model

Edit `api/.env`:

```bash
# Smaller model (cheaper, less accurate)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Larger model (more expensive, more accurate)
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

## Cost Estimation

The seeder estimates cost before generating embeddings:

- **text-embedding-3-large**: $0.13 per 1M tokens
- **Full seed**: ~$0.003-0.005 (very cheap!)
- **Quick seed**: ~$0.001

## Troubleshooting

### "Vector index not found"

**Solution:** Create the vector index in MongoDB Atlas (see VECTOR_INDEX_SETUP.md)

### "No documents crawled"

**Possible causes:**
- Network issues
- Website blocking crawler
- Invalid URLs

**Solution:** Check crawler logs, verify URLs are accessible

### "Search returns zero results"

**Possible causes:**
- Vector index not active yet
- No documents in collection
- Embeddings not generated

**Solution:**
1. Check MongoDB for documents: `db.docs.countDocuments()`
2. Verify index status in Atlas console
3. Re-run seeder if needed

### "Rate limit exceeded"

**Solution:** Adjust delays in `crawler.ts` and `embedder.ts`:

```typescript
// In crawler.ts
await crawlAllResources(resources, 2000); // 2 second delay

// In embedder.ts
const RATE_LIMIT_DELAY = 2000; // 2 seconds
```

### "Embedding dimensions mismatch"

**Solution:** Ensure consistency:
- MongoDB index: `numDimensions: 1536`
- OpenAI model: `text-embedding-3-large` (produces 1536 dims)

## Performance

### Quick Mode (~30 seconds)
- Crawls: 3 resources
- Chunks: 10-20
- Embeddings: ~5-10 seconds
- Insert: ~1 second

### Full Mode (~2 minutes)
- Crawls: 7+ resources
- Chunks: 50-100
- Embeddings: ~30-60 seconds
- Insert: ~2-3 seconds

## Next Steps

After successful seeding:

1. **Test API endpoints**:
   - `/search?q=query` - Vector search
   - `/refresh?q=query` - Live Exa search
   - `/compose` - Multi-query composition

2. **Integrate with frontend**:
   - Connect Angular app to API
   - Display search results
   - Show document sources

3. **Monitor usage**:
   - Check MongoDB metrics
   - Monitor API performance
   - Track embedding costs

4. **Expand knowledge base**:
   - Add more CoST resources
   - Include country-specific reports
   - Add multilingual content

## Support

For issues or questions:
- Check logs: `npm run seed` output
- Review MongoDB Atlas console
- Verify environment variables
- Check network connectivity
