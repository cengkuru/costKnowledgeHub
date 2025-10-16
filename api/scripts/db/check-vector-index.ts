#!/usr/bin/env tsx
/**
 * Check Vector Search Index Status
 *
 * Verifies if the vector search index exists and provides instructions
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COLLECTION_NAME = 'docs';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

const checkVectorIndex = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  MongoDB Atlas Vector Search Index Status                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Check document count
    const docCount = await collection.countDocuments();
    console.log(`📊 Documents in database: ${docCount}`);

    if (docCount === 0) {
      console.log('⚠️  No documents found. Run: npm run seed:quick\n');
      return;
    }

    // Check if documents have embeddings
    const sampleDoc = await collection.findOne({});
    if (!sampleDoc) {
      console.log('❌ No documents found\n');
      return;
    }

    console.log(`✅ Sample document found: ${sampleDoc.title}`);
    console.log(`   - Has embedding: ${sampleDoc.embedding ? 'Yes' : 'No'}`);
    if (sampleDoc.embedding) {
      console.log(`   - Embedding dimensions: ${sampleDoc.embedding.length}`);
    }
    console.log('');

    // List all indexes
    console.log('📋 Checking indexes...');
    const indexes = await collection.listIndexes().toArray();

    console.log(`   Total indexes: ${indexes.length}`);
    indexes.forEach(idx => {
      console.log(`   - ${idx.name}`);
    });
    console.log('');

    // Check for vector search index
    const hasVectorIndex = indexes.some(idx => idx.name === 'embedding_index');

    if (hasVectorIndex) {
      console.log('✅ Vector search index "embedding_index" FOUND!\n');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ Vector Search is Ready!                                ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log('Test your search:');
      console.log('  curl "http://localhost:3000/search?q=OC4IDS"\n');
    } else {
      console.log('❌ Vector search index "embedding_index" NOT FOUND\n');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ⚠️  Action Required: Create Vector Search Index           ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      console.log('📝 Steps to create the index in MongoDB Atlas:\n');
      console.log('1. Go to https://cloud.mongodb.com');
      console.log('2. Select your cluster: infraLens');
      console.log('3. Click on "Atlas Search" tab');
      console.log('4. Click "Create Search Index"');
      console.log('5. Select "Atlas Vector Search"');
      console.log('6. Choose "JSON Editor"');
      console.log('7. Configuration:');
      console.log('   - Database: infrascope');
      console.log('   - Collection: docs');
      console.log('   - Index Name: embedding_index');
      console.log('');
      console.log('8. Paste this JSON configuration:');
      console.log('');
      console.log(JSON.stringify({
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
      }, null, 2));
      console.log('');
      console.log('9. Click "Create Search Index"');
      console.log('10. Wait 1-5 minutes for the index to build');
      console.log('');
      console.log('📄 Full guide: api/VECTOR_INDEX_SETUP_GUIDE.md');
      console.log('📄 JSON config: api/vector-index-config.json\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
  }
};

checkVectorIndex()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
