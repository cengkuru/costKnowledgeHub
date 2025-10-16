#!/usr/bin/env tsx
/**
 * Test MongoDB year filter queries directly
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = 'infrascope';
const COLLECTION_NAME = 'docs';

const testYearFilters = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const docs = db.collection(COLLECTION_NAME);

    console.log('\n🧪 Testing Year Filter Queries\n');

    // Test 1: Exact year
    const exact2020 = await docs.countDocuments({ year: 2020 });
    console.log(`📅 Exact year (year: 2020): ${exact2020} documents`);

    // Test 2: Year range with $gte and $lte
    const range2016_2019 = await docs.countDocuments({
      year: { $gte: 2016, $lte: 2019 }
    });
    console.log(`📅 Year range (2016-2019): ${range2016_2019} documents`);

    // Test 3: Sample documents from 2019
    console.log('\n📰 Sample 2019 documents:');
    const samples2019 = await docs
      .find({ year: 2019 })
      .limit(3)
      .project({ title: 1, year: 1, type: 1 })
      .toArray();
    samples2019.forEach(doc => {
      console.log(`  - ${doc.title} (${doc.type}, ${doc.year})`);
    });

    // Test 4: Test with vector search filter
    console.log('\n🔍 Testing vector search with year filter:');
    const sampleEmbedding = Array(1536).fill(0.1); // Dummy embedding

    const vectorSearchResult = await docs.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: sampleEmbedding,
          numCandidates: 200,
          limit: 10,
          filter: { year: 2019 } // Test exact year filter
        }
      },
      {
        $project: {
          title: 1,
          year: 1,
          type: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ]).toArray();

    console.log(`  Found ${vectorSearchResult.length} results with year filter in $vectorSearch`);
    vectorSearchResult.slice(0, 3).forEach((doc: any) => {
      console.log(`  - ${doc.title} (${doc.year})`);
    });

    // Test 5: Test with range filter
    console.log('\n🔍 Testing vector search with year RANGE filter:');
    const rangeResult = await docs.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: sampleEmbedding,
          numCandidates: 200,
          limit: 10,
          filter: { year: { $gte: 2016, $lte: 2019 } }
        }
      },
      {
        $project: {
          title: 1,
          year: 1,
          type: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ]).toArray();

    console.log(`  Found ${rangeResult.length} results with year range filter`);
    rangeResult.slice(0, 3).forEach((doc: any) => {
      console.log(`  - ${doc.title} (${doc.year})`);
    });

  } finally {
    await client.close();
  }
};

testYearFilters().catch(console.error);
