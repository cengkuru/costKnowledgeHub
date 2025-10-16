#!/usr/bin/env tsx
/**
 * Test Vector Search Directly
 *
 * Tests the MongoDB Atlas Vector Search to diagnose issues
 */

import 'dotenv/config';
import { embed } from '../src/services/embedder.js';
import { vectorSearch, connectMongo } from '../src/services/vectorStore.js';

const testVectorSearch = async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Vector Search Diagnostic Test                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Check database connection
    console.log('1️⃣  Testing MongoDB connection...');
    const collection = await connectMongo();
    const docCount = await collection.countDocuments();
    console.log(`✅ Connected! Found ${docCount} documents\n`);

    if (docCount === 0) {
      console.log('❌ No documents in database. Run: npm run seed:quick\n');
      process.exit(1);
    }

    // Step 2: Check sample document
    console.log('2️⃣  Checking sample document...');
    const sampleDoc = await collection.findOne({});
    console.log(`   Title: ${sampleDoc?.title}`);
    console.log(`   Has embedding: ${sampleDoc?.embedding ? 'Yes' : 'No'}`);
    console.log(`   Embedding dimensions: ${sampleDoc?.embedding?.length || 0}\n`);

    // Step 3: Generate query embedding
    console.log('3️⃣  Generating query embedding...');
    const query = 'What is OC4IDS';
    console.log(`   Query: "${query}"`);
    const qEmbedding = await embed(query);
    console.log(`   ✅ Embedding generated (${qEmbedding.length} dimensions)\n`);

    // Step 4: Test vector search
    console.log('4️⃣  Testing vector search...');
    console.log('   Performing $vectorSearch aggregation...\n');

    const startTime = Date.now();
    const { results, hasMore } = await vectorSearch({
      qEmbedding,
      limit: 5,
      offset: 0,
      filters: {}
    });
    const duration = Date.now() - startTime;

    console.log(`   ⏱️  Query took ${duration}ms`);
    console.log(`   📊 Results: ${results.length}`);
    console.log(`   📄 Has more: ${hasMore}\n`);

    if (results.length > 0) {
      console.log('✅ Vector search is WORKING!\n');
      console.log('Top results:');
      results.forEach((result, i) => {
        console.log(`\n${i + 1}. ${result.title}`);
        console.log(`   Score: ${result.score.toFixed(4)}`);
        console.log(`   Type: ${result.type}`);
        console.log(`   URL: ${result.url}`);
        if (result.text) {
          console.log(`   Text preview: ${result.text.slice(0, 100)}...`);
        }
      });
    } else {
      console.log('❌ Vector search returned ZERO results\n');
      console.log('Possible issues:');
      console.log('1. Vector index not created in Atlas UI');
      console.log('2. Index name mismatch (must be "vector_index")');
      console.log('3. Index still building (check Atlas UI status)');
      console.log('4. Index field path incorrect (must be "embedding")');
      console.log('\n📝 Verify in MongoDB Atlas:');
      console.log('   - Go to Atlas Search tab');
      console.log('   - Look for index named "vector_index"');
      console.log('   - Status should be "Active"');
      console.log('   - Database: infrascope');
      console.log('   - Collection: docs');
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Test Complete                                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Error during test:\n');
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error(`\nStack trace:`);
      console.error(error.stack);
    } else {
      console.error(error);
    }

    console.log('\n💡 Common error causes:');
    console.log('   - "index not found": Vector index not created in Atlas');
    console.log('   - "path not indexed": Field path mismatch');
    console.log('   - "connection error": Check MongoDB URI');
    process.exit(1);
  }
};

testVectorSearch()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
