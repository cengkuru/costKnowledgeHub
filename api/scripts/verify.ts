#!/usr/bin/env tsx
/**
 * Database Verification Script
 *
 * Checks MongoDB collection for proper seeding
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COLLECTION_NAME = 'docs';

const verify = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Database Verification                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Count documents
    const totalDocs = await collection.countDocuments();
    console.log(`📊 Total documents: ${totalDocs}`);

    if (totalDocs === 0) {
      console.log('\n❌ No documents found. Run: npm run seed');
      process.exit(1);
    }

    // Get sample document
    const sampleDoc = await collection.findOne();
    console.log('\n📄 Sample document structure:');
    console.log(`  - Title: ${sampleDoc?.title}`);
    console.log(`  - Type: ${sampleDoc?.type}`);
    console.log(`  - URL: ${sampleDoc?.url}`);
    console.log(`  - Content length: ${sampleDoc?.content?.length || 0} chars`);
    console.log(`  - Embedding dimensions: ${sampleDoc?.embedding?.length || 0}`);
    console.log(`  - Source: ${sampleDoc?.metadata?.source}`);

    // Validate embeddings
    if (sampleDoc?.embedding?.length !== 1536) {
      console.log('\n⚠️  Warning: Embedding dimensions incorrect!');
      console.log(`   Expected: 1536, Got: ${sampleDoc?.embedding?.length}`);
    } else {
      console.log('\n✅ Embeddings are correct (1536 dimensions)');
    }

    // Check document types
    const types = await collection.distinct('type');
    console.log(`\n📚 Document types (${types.length}):`);
    for (const type of types) {
      const count = await collection.countDocuments({ type });
      console.log(`  - ${type}: ${count}`);
    }

    // Check sources
    const sources = await collection.distinct('metadata.source');
    console.log(`\n🌐 Sources (${sources.length}):`);
    sources.forEach(source => console.log(`  - ${source}`));

    // Check indexes
    console.log('\n🔍 Indexes:');
    const indexes = await collection.listIndexes().toArray();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}`);
    });

    const hasVectorIndex = indexes.some(idx => idx.name === 'embedding_index');
    if (hasVectorIndex) {
      console.log('\n✅ Vector search index found!');
    } else {
      console.log('\n⚠️  Vector search index NOT found');
      console.log('   Create it in MongoDB Atlas: see scripts/VECTOR_INDEX_SETUP.md');
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Verification Complete                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } finally {
    await client.close();
  }
};

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
