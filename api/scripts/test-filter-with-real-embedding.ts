#!/usr/bin/env tsx
/**
 * Test year filters with REAL embedding from OpenAI
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';
import { generateEmbedding } from './utils/embedder.js';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = 'infrascope';
const COLLECTION_NAME = 'docs';

const testWithRealEmbedding = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const docs = db.collection(COLLECTION_NAME);

    console.log('\n🧪 Testing Year Filters with REAL Embedding\n');

    // Generate real embedding for "infrastructure transparency"
    console.log('📊 Generating embedding for query: "infrastructure transparency"...');
    const queryEmbedding = await generateEmbedding('infrastructure transparency');
    console.log(`✅ Generated embedding with ${queryEmbedding.length} dimensions\n`);

    // Test 1: No filter (baseline)
    console.log('🔍 Test 1: No filter (baseline)');
    const noFilter = await docs.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 200,
          limit: 5
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

    console.log(`  Found ${noFilter.length} results`);
    noFilter.forEach((doc: any) => {
      console.log(`  - ${doc.title.slice(0, 60)}... (${doc.year}) [score: ${doc.score.toFixed(4)}]`);
    });

    // Test 2: Exact year filter
    console.log('\n🔍 Test 2: Exact year filter (year: 2019)');
    const exactYear = await docs.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 200,
          limit: 5,
          filter: { year: 2019 }
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

    console.log(`  Found ${exactYear.length} results`);
    exactYear.forEach((doc: any) => {
      console.log(`  - ${doc.title.slice(0, 60)}... (${doc.year})`);
    });

    // Test 3: Year range filter
    console.log('\n🔍 Test 3: Year range filter (2018-2020)');
    const rangeFilter = await docs.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 200,
          limit: 5,
          filter: { year: { $gte: 2018, $lte: 2020 } }
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

    console.log(`  Found ${rangeFilter.length} results`);
    rangeFilter.forEach((doc: any) => {
      console.log(`  - ${doc.title.slice(0, 60)}... (${doc.year})`);
    });

    // Test 4: Type filter
    console.log('\n🔍 Test 4: Type filter (type: "Blog Post")');
    const typeFilter = await docs.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 200,
          limit: 5,
          filter: { type: 'Blog Post' }
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

    console.log(`  Found ${typeFilter.length} results`);
    typeFilter.forEach((doc: any) => {
      console.log(`  - ${doc.title.slice(0, 60)}... (${doc.type}, ${doc.year})`);
    });

  } finally {
    await client.close();
  }
};

testWithRealEmbedding().catch(console.error);
