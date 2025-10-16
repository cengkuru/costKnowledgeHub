#!/usr/bin/env tsx
/**
 * Raw Vector Search Test with Error Details
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { embed } from '../src/services/embedder.js';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.DB_NAME || 'infrascope';

const testRawVectorSearch = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection('docs');

    console.log('Generating query embedding...');
    const qEmbedding = await embed('What is OC4IDS');
    console.log(`Embedding dimensions: ${(qEmbedding as number[]).length}\n`);

    console.log('Executing raw $vectorSearch aggregation...\n');

    const pipeline = [
      {
        $vectorSearch: {
          index: 'embedding_index',
          path: 'embedding',
          queryVector: qEmbedding,
          numCandidates: 200,
          limit: 5
        }
      },
      {
        $project: {
          title: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];

    console.log('Pipeline:');
    console.log(JSON.stringify(pipeline, null, 2));
    console.log('\n');

    const results = await collection.aggregate(pipeline).toArray();

    console.log(`Results: ${results.length}`);
    if (results.length > 0) {
      console.log('\n✅ SUCCESS! Results:');
      results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.title} (score: ${r.score})`);
      });
    } else {
      console.log('\n❌ No results - Check Atlas Search index status');
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.codeName) console.error('Code:', error.codeName);
    if (error.code) console.error('Error code:', error.code);
    console.error('\nFull error:');
    console.error(JSON.stringify(error, null, 2));
  } finally {
    await client.close();
  }
};

testRawVectorSearch();
