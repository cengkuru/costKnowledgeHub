# MongoDB Atlas Vector Search Index Setup Guide

## Problem
The search is returning empty results because the vector search index hasn't been created yet in MongoDB Atlas. Vector search indexes **must be created manually** through the Atlas UI or Admin API.

## Solution Overview
1. Create the vector search index in MongoDB Atlas UI
2. Populate the database with embedded documents
3. Test the search functionality

---

## Step 1: Create Vector Search Index in MongoDB Atlas

### Access MongoDB Atlas
1. Go to https://cloud.mongodb.com
2. Log in with your credentials
3. Select your cluster: **infraLens**

### Create the Index
1. Click on your cluster name
2. Navigate to the **"Atlas Search"** tab (not "Search Indexes")
3. Click **"Create Search Index"**
4. Select **"Atlas Vector Search"** (not regular search)
5. Choose **"JSON Editor"** option

### Configuration Details
- **Database**: `infrascope` (from your connection string)
- **Collection**: `docs`
- **Index Name**: `embedding_index`

### JSON Configuration
Copy and paste this exact configuration:

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
    },
    {
      "type": "filter",
      "path": "metadata.source"
    }
  ]
}
```

### Important Notes
- **numDimensions: 1536** - This matches OpenAI's text-embedding-3-large model
- **similarity: cosine** - Best for semantic similarity search
- The index will take **1-5 minutes** to build after creation
- Wait for the status to show **"Active"** before proceeding

---

## Step 2: Populate the Database

Once the index is **Active**, run the seeding script:

### Quick Test (First 3 Resources)
```bash
cd api
npm run seed:quick
```

### Full Seeding (All Resources)
```bash
cd api
npm run seed
```

### What the Seeding Does
1. Crawls CoST websites for content
2. Chunks documents into searchable pieces
3. Generates vector embeddings using OpenAI
4. Inserts documents with embeddings into MongoDB
5. Verifies the vector index exists

### Expected Output
```
╔════════════════════════════════════════════════════════════╗
║  CoST Knowledge Hub - Database Seeder                      ║
╚════════════════════════════════════════════════════════════╝

📡 Connecting to MongoDB...
✅ Connected to MongoDB

🕷️  Step 1: Crawling CoST websites...
✅ Crawled X documents

✂️  Step 2: Chunking documents...
✅ Created X total chunks

💰 Step 3: Estimating embedding cost...
  - Approximate tokens: X
  - Estimated cost: $X.XXXX

🧮 Step 4: Generating embeddings...
  Progress: X/X (100.0%)
✅ Embeddings generated

📦 Step 5: Preparing documents...
✅ Prepared X documents

💾 Step 6: Inserting into MongoDB...
✅ Inserted X documents

🔍 Step 7: Verifying indexes...
✅ Vector search index "embedding_index" found

╔════════════════════════════════════════════════════════════╗
║  ✅ Seeding Complete!                                       ║
╚════════════════════════════════════════════════════════════╝
```

---

## Step 3: Test Vector Search

### Start the API Server
```bash
cd api
npm run dev
```

### Test Search Endpoint
```bash
# Test semantic search
curl "http://localhost:3000/search?q=What+is+OC4IDS"

# Test with filters
curl "http://localhost:3000/search?q=infrastructure+transparency&country=Kenya&year=2023"
```

### Expected Response
```json
{
  "answer": [
    {
      "text": "OC4IDS is the Open Contracting for Infrastructure Data Standards...",
      "cites": [
        {
          "title": "OC4IDS Documentation",
          "url": "https://..."
        }
      ]
    }
  ],
  "items": [
    {
      "id": "...",
      "title": "OC4IDS Documentation",
      "type": "Manual",
      "summary": "...",
      "url": "https://..."
    }
  ],
  "page": 1,
  "pageSize": 10,
  "hasMore": false
}
```

---

## Troubleshooting

### Issue: "Vector index not found"
**Solution**: Wait 1-5 minutes for the index to finish building in Atlas. Check the Atlas Search tab for index status.

### Issue: "No results returned"
**Possible causes**:
1. Vector index is still building (check Atlas UI)
2. Database is empty (run `npm run seed`)
3. Index name mismatch (must be exactly `embedding_index`)

### Issue: Seeding fails with "MONGODB_URI not found"
**Solution**: Ensure `.env` file exists in `api/` directory with:
```bash
MONGODB_URI=mongodb+srv://michael_db_user:EYVLouWU8unUsEet@infralens.zoul60d.mongodb.net/?retryWrites=true&w=majority&appName=infraLens
DB_NAME=infrascope
OPENAI_API_KEY=your_openai_key_here
```

### Issue: Embeddings cost concern
**Solution**:
- Start with `npm run seed:quick` (only 3 resources)
- Check estimated cost in the seeding output
- Full seeding typically costs $0.10-$0.50

---

## Verification Checklist

- [ ] MongoDB Atlas vector index created
- [ ] Index status shows "Active" in Atlas UI
- [ ] Index name is exactly `embedding_index`
- [ ] Database seeding completed successfully
- [ ] Test search returns results
- [ ] API server running without errors

---

## Architecture Overview

```
User Query
    ↓
API Endpoint (/search)
    ↓
Generate Query Embedding (OpenAI)
    ↓
MongoDB Atlas Vector Search ($vectorSearch)
    ↓
Retrieve Top-K Similar Documents
    ↓
AI Synthesis (Gemini)
    ↓
Return Answer + Citations
```

## Files Reference
- **Vector Search Logic**: `api/src/services/vectorStore.ts`
- **Index Config Script**: `api/scripts/db/create-vector-index.ts`
- **Seeding Script**: `api/scripts/seed.ts`
- **Search Route**: `api/src/routes/search.ts`
- **Type Definitions**: `api/src/types.ts`

---

## Next Steps After Setup
1. Test various search queries
2. Monitor search performance in MongoDB Atlas
3. Adjust numCandidates in vectorStore.ts if needed
4. Set up incremental updates with `npm run seed:incremental`
