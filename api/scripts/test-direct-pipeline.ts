#!/usr/bin/env tsx
/**
 * Test the exact pipeline that vectorStore.ts uses
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';
import { generateEmbedding } from './utils/embedder.js';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = 'infrascope';
const COLLECTION_NAME = 'docs';

const testPipeline = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection(COLLECTION_NAME);

    console.log('\n🧪 Testing Exact vectorStore Pipeline\n');

    // Generate embedding
    const queryEmbedding = await generateEmbedding('infrastructure');

    //Test 1: With exact year filter using $match
    console.log('Test 1: Pipeline with year: 2019 in $match');
    const filters = { year: 2019 };

    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 400,
          limit: 30
        }
      },
      {
        $project: {
          title: 1,
          url: 1,
          type: 1,
          country: 1,
          year: 1,
          text: '$content',
          score: { $meta: 'vectorSearchScore' }
        }
      },
      { $match: filters }, // Post-filtering
      { $sort: { score: -1 } },
      { $limit: 5 }
    ];

    console.log('Pipeline:', JSON.stringify(pipeline, null, 2));

    const results = await col.aggregate(pipeline).toArray();
    console.log(`\n✅ Found ${results.length} results`);
    results.forEach((doc: any) => {
      console.log(`  - ${doc.title.slice(0, 60)}... (${doc.year}) [${doc.score.toFixed(4)}]`);
    });

    // Test 2: With year range filter
    console.log('\n\nTest 2: Pipeline with yearFrom=2018, yearTo=2020');
    const rangeFilters = { year: { $gte: 2018, $lte: 2020 } };

    const rangePipeline: any[] = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 400,
          limit: 30
        }
      },
      {
        $project: {
          title: 1,
          url: 1,
          type: 1,
          country: 1,
          year: 1,
          text: '$content',
          score: { $meta: 'vectorSearchScore' }
        }
      },
      { $match: rangeFilters },
      { $sort: { score: -1 } },
      { $limit: 5 }
    ];

    const rangeResults = await col.aggregate(rangePipeline).toArray();
    console.log(`\n✅ Found ${rangeResults.length} results`);
    rangeResults.forEach((doc: any) => {
      console.log(`  - ${doc.title.slice(0, 60)}... (${doc.year}) [${doc.score.toFixed(4)}]`);
    });

    // Test 3: Without any filters (baseline)
    console.log('\n\nTest 3: Pipeline WITHOUT filters (baseline)');
    const noFilterPipeline: any[] = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 400,
          limit: 30
        }
      },
      {
        $project: {
          title: 1,
          year: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      },
      { $limit: 10 }
    ];

    const noFilterResults = await col.aggregate(noFilterPipeline).toArray();
    console.log(`\n✅ Found ${noFilterResults.length} results`);

    // Show year distribution
    const yearCounts: Record<number, number> = {};
    noFilterResults.forEach((doc: any) => {
      yearCounts[doc.year] = (yearCounts[doc.year] || 0) + 1;
    });
    console.log('\nYear distribution in top 10 results:');
    Object.entries(yearCounts).sort(([a], [b]) => Number(b) - Number(a)).forEach(([year, count]) => {
      console.log(`  ${year}: ${count} docs`);
    });

  } finally {
    await client.close();
  }
};

testPipeline().catch(console.error);
