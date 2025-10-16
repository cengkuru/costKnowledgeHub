#!/usr/bin/env tsx
/**
 * List all Atlas Search indexes including vector indexes
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = 'infrascope';
const COLLECTION_NAME = 'docs';

const listSearchIndexes = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log('\n🔍 Listing All Search Indexes (including vector indexes)\n');

    // Use listSearchIndexes() to get Atlas Search and Vector Search indexes
    const searchIndexes = collection.listSearchIndexes();
    const indexes = await searchIndexes.toArray();

    if (indexes.length === 0) {
      console.log('❌ No Atlas Search or Vector Search indexes found');
      console.log('\nNote: Regular MongoDB indexes (like _id_, type_country) won\'t show here.');
      console.log('Those are only for traditional queries, not $vectorSearch or $search.\n');
    } else {
      console.log(`✅ Found ${indexes.length} Atlas Search/Vector index(es):\n`);
      indexes.forEach((idx: any) => {
        console.log(`📋 Index Name: ${idx.name}`);
        console.log(`   Type: ${idx.type || 'search'}`);
        console.log(`   Status: ${idx.status || idx.queryable ? 'READY' : 'BUILDING'}`);
        console.log(`   Definition:`, JSON.stringify(idx.latestDefinition || idx.definition, null, 2));
        console.log('');
      });
    }

    // Also show regular indexes for comparison
    console.log('\n📊 Regular MongoDB Indexes (for reference):');
    const regularIndexes = await collection.indexes();
    regularIndexes.forEach(idx => {
      console.log(`  - ${idx.name}`);
    });

  } finally {
    await client.close();
  }
};

listSearchIndexes().catch(console.error);
