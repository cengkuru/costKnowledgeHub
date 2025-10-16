# Complete Setup Guide

## ✅ What We've Built

Successfully created a complete data pipeline that:

1. **Crawls real CoST websites** - No fake data!
   - OC4IDS standards documentation
   - Implementation guides
   - Schema references
   - CoST approach documents
   - Resource libraries
   - Impact stories
   - Templates

2. **Processes content intelligently**
   - Smart text chunking (preserves context)
   - Handles large documents by splitting at semantic boundaries
   - Adds overlap between chunks for continuity

3. **Generates embeddings**
   - Uses OpenAI's `text-embedding-3-large`
   - 1536 dimensions (verified ✓)
   - Batch processing for efficiency
   - Cost estimation (~$0.0002 for quick mode)

4. **Populates MongoDB**
   - 5 documents successfully inserted
   - Proper schema with metadata
   - Ready for vector search

## 🔴 Critical Next Step: Create Vector Index

**Your search endpoint returns empty because MongoDB needs a vector search index.**

### Create the Index (5 minutes)

1. **Go to MongoDB Atlas Console**
   - Visit: https://cloud.mongodb.com
   - Select your cluster
   - Navigate to "Atlas Search" tab

2. **Create Search Index**
   - Click "Create Search Index"
   - Select "JSON Editor"
   - Database: `infrascope`
   - Collection: `docs`

3. **Paste This Configuration**

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
    },
    {
      "type": "filter",
      "path": "metadata.source"
    }
  ]
}
```

4. **Wait for Index to Build**
   - Status will change from "Building" to "Active"
   - Takes 1-5 minutes
   - Refresh the page to check status

5. **Verify Index Created**

```bash
cd api
npm run verify
# Should now show: "✅ Vector search index found!"
```

## 🧪 Testing After Index Creation

### 1. Test Simple Search

```bash
curl "http://localhost:3000/search?q=OC4IDS"
```

**Expected output:**
```json
{
  "answer": "OC4IDS (Open Contracting for Infrastructure Data Standard) is...",
  "items": [
    {
      "title": "OC4IDS: Open Contracting for Infrastructure Data Standard",
      "summary": "Complete documentation for...",
      "url": "https://standard.open-contracting.org/...",
      "score": 0.89
    }
  ]
}
```

### 2. Test Different Queries

```bash
# Implementation guidance
curl "http://localhost:3000/search?q=implementation%20guide"

# Schema reference
curl "http://localhost:3000/search?q=schema%20reference"

# Templates
curl "http://localhost:3000/search?q=project%20template"
```

### 3. Test from Angular Frontend

Once the API is returning results:

```typescript
// In your Angular service
this.http.get('http://localhost:3000/search?q=OC4IDS')
  .subscribe(result => {
    console.log('Search results:', result);
  });
```

## 📊 Current Database Status

Run this to see current stats:

```bash
cd api
npm run verify
```

**Current stats:**
- ✅ 5 documents inserted
- ✅ 1536-dimensional embeddings
- ✅ 2 document types (Manual, Guide)
- ✅ Real content from standard.open-contracting.org
- ⚠️ Vector index needed (create manually)

## 🚀 Expanding the Knowledge Base

### Add More Resources (Full Seed)

```bash
cd api
npm run seed  # Seeds all 7+ resources (~$0.005)
```

### Add Custom Resources

Edit `api/scripts/utils/crawler.ts` and add to `COST_RESOURCES`:

```typescript
{
  url: 'https://your-cost-site.com/document',
  title: 'Your Document Title',
  type: 'Impact Story', // or Manual, Template, Guide, etc.
  summary: 'Brief description',
  country: 'Kenya', // optional
  year: 2024       // optional
}
```

Then run:

```bash
npm run seed
```

## 🎯 Search Features Once Index is Active

Your API will support:

1. **Vector Similarity Search**
   - Finds semantically similar content
   - Works with natural language queries
   - Returns ranked results by relevance

2. **Filtered Search**
   - Filter by document type: `type=Manual`
   - Filter by country: `country=Uganda`
   - Filter by year: `year=2024`

3. **Hybrid Search**
   - Combines MongoDB vector search
   - With live Exa web search
   - For comprehensive results

4. **AI Answer Synthesis**
   - Uses Gemini 2.0 Flash
   - Synthesizes answers from results
   - Cites sources automatically

## 📁 Files Created

```
api/scripts/
├── README.md                    # General documentation
├── VECTOR_INDEX_SETUP.md        # Detailed index setup
├── SETUP_COMPLETE.md            # This file
├── seed.ts                      # Main seeder script
├── verify.ts                    # Database verification
└── utils/
    ├── crawler.ts               # Web crawler (real data!)
    ├── chunker.ts               # Text chunking
    └── embedder.ts              # Embedding generation
```

## 🔧 Commands Reference

```bash
# Quick seed (3 resources, ~30 seconds)
npm run seed:quick

# Full seed (all resources, ~2 minutes)
npm run seed

# Verify database
npm run verify

# Start API server
npm run dev

# Test search
curl "http://localhost:3000/search?q=your%20query"
```

## ❓ Troubleshooting

### Search returns empty results

**Cause:** Vector index not created yet

**Solution:** Create the index in MongoDB Atlas (see above)

### "Embedding dimensions incorrect"

**Cause:** Old data with wrong dimensions

**Solution:**
```bash
npm run seed:quick  # Re-seed with correct dimensions
```

### Crawler fails to fetch pages

**Possible causes:**
- Network issues
- Website blocking requests
- Rate limiting

**Solution:**
- Check internet connection
- Increase delays in `crawler.ts`
- Verify URLs are accessible

### High embedding costs

**Solution:**
- Use `seed:quick` for testing
- Monitor costs with estimate before generation
- Current cost: ~$0.0002 for 5 documents

## 🎉 Success Criteria

You'll know everything is working when:

1. ✅ `npm run verify` shows vector index found
2. ✅ Search endpoint returns results
3. ✅ Results have similarity scores
4. ✅ AI synthesizes answers from content
5. ✅ Angular frontend displays results

## 🔜 Next Steps

1. **Create vector index** (5 min) - Most critical!
2. **Test search endpoint** (2 min)
3. **Run full seed** (2 min) - More content
4. **Integrate with Angular** (10 min)
5. **Add more resources** (ongoing)

---

**Need help?** Check:
- `README.md` - Pipeline documentation
- `VECTOR_INDEX_SETUP.md` - Index creation details
- MongoDB logs - Connection issues
- API logs - Search behavior
