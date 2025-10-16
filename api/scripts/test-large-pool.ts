#!/usr/bin/env tsx
/**
 * Test with LARGE search pool before filtering
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';
import { generateEmbedding } from './utils/embedder.js';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = 'infrascope';
const COLLECTION_NAME = 'docs';

const testLargePool = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection(COLLECTION_NAME);

    console.log('\n🧪 Testing Year Filter with LARGE Search Pool\n');

    const queryEmbedding = await generateEmbedding('infrastructure');

    // Test with 200 results before filtering
    console.log('Test: Search 200 docs, then filter for year=2019');
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 1000,
          limit: 200  // Search 200 docs before filtering
        }
      },
      {
        $project: {
          title: 1,
          year: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];

    // First, see year distribution in top 200
    const allResults = await col.aggregate(pipeline).toArray();
    const yearCounts: Record<number, number> = {};
    allResults.forEach((doc: any) => {
      yearCounts[doc.year] = (yearCounts[doc.year] || 0) + 1;
    });

    console.log(`\n✅ Found ${allResults.length} results before filtering`);
    console.log('\nYear distribution:');
    Object.entries(yearCounts).sort(([a], [b]) => Number(b) - Number(a)).forEach(([year, count]) => {
      console.log(`  ${year}: ${count} docs`);
    });

    // Now apply filter
    const filtered2019 = allResults.filter((doc: any) => doc.year === 2019);
    console.log(`\n📅 After filtering for year=2019: ${filtered2019.length} results`);
    filtered2019.slice(0, 5).forEach((doc: any) => {
      console.log(`  - ${doc.title.slice(0, 60)}... (${doc.year}) [${doc.score.toFixed(4)}]`);
    });

    // Test range filter
    const filtered2018_2020 = allResults.filter((doc: any) => doc.year >= 2018 && doc.year <= 2020);
    console.log(`\n📅 After filtering for 2018-2020: ${filtered2018_2020.length} results`);

  } finally {
    await client.close();
  }
};

testLargePool().catch(console.error);
