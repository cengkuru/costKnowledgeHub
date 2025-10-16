import 'dotenv/config';
import { embed } from '../services/embedder.js';
import { vectorSearch } from '../services/vectorStore.js';
import { closeMongo } from '../services/vectorStore.js';

/**
 * Test script to verify vector search is working
 * Run with: npx tsx api/src/scripts/test-search.ts
 */
async function testSearch() {
  console.log('🔍 Testing Vector Search...\n');

  const testQuery = 'infrastructure transparency';
  console.log(`Query: "${testQuery}"\n`);

  try {
    // Generate embedding for test query
    console.log('1️⃣ Generating query embedding...');
    const queryEmbedding = await embed(testQuery) as number[];
    console.log(`✅ Generated ${queryEmbedding.length}-dim embedding\n`);

    // Perform vector search
    console.log('2️⃣ Performing vector search...');
    const startTime = Date.now();
    const { results, hasMore } = await vectorSearch({
      qEmbedding: queryEmbedding,
      limit: 5,
      offset: 0,
      filters: {}
    });
    const duration = Date.now() - startTime;

    console.log(`✅ Search completed in ${duration}ms\n`);

    // Display results
    console.log('📊 Results:');
    console.log(`Found: ${results.length} documents (hasMore: ${hasMore})\n`);

    if (results.length === 0) {
      console.log('❌ NO RESULTS RETURNED');
      console.log('\nPossible issues:');
      console.log('1. Vector index name mismatch (check Atlas UI)');
      console.log('2. Index not fully built (check Atlas status)');
      console.log('3. Embedding dimensions mismatch');
      console.log('4. Index definition incorrect');
    } else {
      console.log('✅ SUCCESS! Vector search is working.\n');
      results.forEach((doc, i) => {
        console.log(`${i + 1}. ${doc.title}`);
        console.log(`   Score: ${doc.score.toFixed(4)}`);
        console.log(`   Type: ${doc.type}, Country: ${doc.country}, Year: ${doc.year}`);
        console.log(`   Text: ${doc.text.substring(0, 100)}...`);
        console.log(`   URL: ${doc.url}\n`);
      });
    }
  } catch (error) {
    console.error('❌ Error during search:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await closeMongo();
  }
}

testSearch();
