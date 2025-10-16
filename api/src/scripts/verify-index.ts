import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Diagnostic script to verify MongoDB Atlas vector search index configuration
 * Run with: npx tsx api/src/scripts/verify-index.ts
 */
async function verifyIndex() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas\n');

    const db = client.db('infrascope');
    const collection = db.collection('docs');

    // List all indexes
    console.log('📊 All indexes on "docs" collection:');
    const indexes = await collection.listIndexes().toArray();
    indexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${idx.name} (type: ${idx.type || 'standard'})`);
    });

    // Check for vector search index
    const vectorIndex = indexes.find(idx =>
      idx.type === 'vectorSearch' || idx.name?.includes('vector')
    );

    console.log('\n🔍 Vector Search Index Details:');
    if (vectorIndex) {
      console.log(`✅ Found: ${vectorIndex.name}`);
      console.log(JSON.stringify(vectorIndex, null, 2));
    } else {
      console.log('❌ No vector search index found');
    }

    // Count documents with embeddings
    console.log('\n📈 Document Statistics:');
    const total = await collection.countDocuments({});
    const withEmbedding = await collection.countDocuments({
      embedding: { $exists: true, $ne: null }
    });
    console.log(`Total documents: ${total}`);
    console.log(`With embeddings: ${withEmbedding}`);

    // Check embedding dimensions
    const sample = await collection.findOne({ embedding: { $exists: true } });
    if (sample && Array.isArray(sample.embedding)) {
      console.log(`Embedding dimensions: ${sample.embedding.length}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

verifyIndex();
