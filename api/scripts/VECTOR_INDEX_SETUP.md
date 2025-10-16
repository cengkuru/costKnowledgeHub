# MongoDB Atlas Vector Search Index Setup

## Step 1: Access MongoDB Atlas Console

1. Go to https://cloud.mongodb.com
2. Navigate to your cluster → Browse Collections
3. Select database: `infrascope`
4. Ensure collection `docs` exists (if not, create it)

## Step 2: Create Vector Search Index

1. Go to Atlas Search tab
2. Click "Create Search Index"
3. Select "JSON Editor"
4. Use the configuration below:

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

## Step 3: Wait for Index Build

- Index creation takes 1-5 minutes
- Status will change from "Building" to "Active"
- Verify index exists before running seed script

## Step 4: Verify Index via MongoDB Shell (Optional)

```javascript
// Connect to cluster
use infrascope

// Check indexes
db.docs.getIndexes()

// Should see embedding_index in the list
```

## Alternative: Programmatic Index Creation

If you prefer to create the index via code, use the MongoDB Atlas Admin API:

```bash
# Get your Atlas API credentials
# Public Key: <your-public-key>
# Private Key: <your-private-key>

curl --user "<public-key>:<private-key>" \
  --digest \
  --header "Content-Type: application/json" \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/<project-id>/clusters/<cluster-name>/fts/indexes" \
  --data @vector_index_config.json
```

## Document Schema Expected

```typescript
interface CostDocument {
  _id: string;
  title: string;
  type: 'Manual' | 'Template' | 'Assurance Report' | 'Guide' | 'Impact Story' | 'Resource';
  summary: string;
  content: string; // Full text
  embedding: number[]; // 1536 dimensions from OpenAI text-embedding-3-large
  country?: string;
  year?: number;
  url: string;
  metadata: {
    source: string;
    crawledAt: Date;
    chunkIndex?: number;
    totalChunks?: number;
  };
}
```

## Testing the Index

After index is active and data is seeded, test with:

```bash
# Run seed script first
npm run seed

# Test search endpoint
curl "http://localhost:3000/search?q=OC4IDS implementation guide"

# Should return relevant documents with scores
```

## Troubleshooting

- **Index not found**: Wait for index to finish building
- **Zero results**: Ensure documents have embeddings field
- **Dimension mismatch**: Verify embeddings are 1536-dimensional arrays
- **Slow queries**: Check index is active and properly configured
