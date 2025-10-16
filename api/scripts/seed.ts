#!/usr/bin/env tsx
/**
 * MongoDB Database Seeder
 *
 * Crawls real CoST websites, chunks content, generates embeddings,
 * and populates MongoDB Atlas with searchable knowledge base
 *
 * Usage:
 *   npm run seed              # Seed all resources
 *   npm run seed:quick        # Seed first 3 resources (fast test)
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';
import { crawlAllResources, COST_RESOURCES } from './utils/crawler.js';
import { chunkText } from './utils/chunker.js';
import { generateEmbeddingsBatch, estimateEmbeddingCost } from './utils/embedder.js';

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COLLECTION_NAME = 'docs';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

interface MongoDocument {
  title: string;
  type: string;
  summary: string;
  content: string;
  embedding: number[];
  url: string;
  country?: string;
  year?: number;
  metadata: {
    source: string;
    crawledAt: Date;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

/**
 * Main seeding function
 */
const seedDatabase = async (limitResources?: number) => {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  CoST Knowledge Hub - Database Seeder                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<MongoDocument>(COLLECTION_NAME);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data (optional - comment out to preserve existing docs)
    console.log('🗑️  Clearing existing documents...');
    const deleteResult = await collection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing documents\n`);

    // Step 1: Crawl websites
    console.log('🕷️  Step 1: Crawling CoST websites...');
    const resourcesToCrawl = limitResources
      ? COST_RESOURCES.slice(0, limitResources)
      : COST_RESOURCES;

    const crawledDocs = await crawlAllResources(resourcesToCrawl);

    if (crawledDocs.length === 0) {
      console.error('❌ No documents crawled. Exiting.');
      process.exit(1);
    }

    console.log(`✅ Crawled ${crawledDocs.length} documents\n`);

    // Step 2: Chunk documents
    console.log('✂️  Step 2: Chunking documents...');
    const allChunks: Array<{
      docId: number;
      chunkIndex: number;
      totalChunks: number;
      text: string;
      doc: typeof crawledDocs[0];
    }> = [];

    crawledDocs.forEach((doc, docIndex) => {
      const chunks = chunkText(doc.content, {
        maxTokens: 512,
        overlap: 50,
        preserveContext: true
      });

      chunks.forEach(chunk => {
        allChunks.push({
          docId: docIndex,
          chunkIndex: chunk.index,
          totalChunks: chunk.totalChunks,
          text: chunk.text,
          doc
        });
      });

      console.log(`  - ${doc.title}: ${chunks.length} chunks`);
    });

    console.log(`✅ Created ${allChunks.length} total chunks\n`);

    // Step 3: Estimate cost
    console.log('💰 Step 3: Estimating embedding cost...');
    const texts = allChunks.map(c => c.text);
    const { approximateTokens, estimatedCostUSD } = estimateEmbeddingCost(texts);
    console.log(`  - Approximate tokens: ${approximateTokens.toLocaleString()}`);
    console.log(`  - Estimated cost: $${estimatedCostUSD.toFixed(4)}`);
    console.log('');

    // Step 4: Generate embeddings
    console.log('🧮 Step 4: Generating embeddings...');
    const embeddings = await generateEmbeddingsBatch(texts, {
      onProgress: (completed, total) => {
        const percent = ((completed / total) * 100).toFixed(1);
        process.stdout.write(`\r  Progress: ${completed}/${total} (${percent}%)`);
      }
    });
    console.log('\n✅ Embeddings generated\n');

    // Step 5: Prepare documents for MongoDB
    console.log('📦 Step 5: Preparing documents...');
    const mongoDocuments: MongoDocument[] = allChunks.map((chunk, index) => {
      const uniqueUrl = chunk.totalChunks > 1
        ? `${chunk.doc.url}#chunk-${chunk.chunkIndex + 1}`
        : chunk.doc.url;

      return {
        title: chunk.totalChunks > 1
          ? `${chunk.doc.title} (Part ${chunk.chunkIndex + 1}/${chunk.totalChunks})`
          : chunk.doc.title,
        type: chunk.doc.type,
        summary: chunk.doc.summary,
        content: chunk.text,
        embedding: embeddings[index].embedding,
        url: uniqueUrl,
        country: chunk.doc.country,
        year: chunk.doc.year,
        metadata: {
          source: chunk.doc.metadata.source,
          crawledAt: chunk.doc.metadata.crawledAt,
          chunkIndex: chunk.totalChunks > 1 ? chunk.chunkIndex : undefined,
          totalChunks: chunk.totalChunks > 1 ? chunk.totalChunks : undefined
        }
      };
    });

    console.log(`✅ Prepared ${mongoDocuments.length} documents\n`);

    // Step 6: Insert into MongoDB
    console.log('💾 Step 6: Inserting into MongoDB...');
    const bulkOps = mongoDocuments.map(doc => ({
      updateOne: {
        filter: { url: doc.url },
        update: { $set: doc },
        upsert: true
      }
    }));

    const bulkResult = await collection.bulkWrite(bulkOps, { ordered: false });
    const upsertedCount = bulkResult.upsertedCount ?? 0;
    const modifiedCount = bulkResult.modifiedCount ?? 0;

    console.log(
      `✅ Upserted ${upsertedCount} documents (updated: ${modifiedCount}, matched: ${bulkResult.matchedCount})\n`
    );

    // Step 7: Verify index
    console.log('🔍 Step 7: Verifying indexes...');
    const indexes = await collection.listIndexes().toArray();
    const hasVectorIndex = indexes.some(idx => idx.name === 'embedding_index');

    if (hasVectorIndex) {
      console.log('✅ Vector search index "embedding_index" found');
    } else {
      console.warn('⚠️  Warning: Vector search index "embedding_index" not found');
      console.warn('   Please create the index manually in MongoDB Atlas');
      console.warn('   See: api/scripts/VECTOR_INDEX_SETUP.md');
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Seeding Complete!                                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log(`  - Documents crawled: ${crawledDocs.length}`);
    console.log(`  - Total chunks: ${allChunks.length}`);
    console.log(`  - Embeddings generated: ${embeddings.length}`);
    console.log(`  - Documents upserted: ${upsertedCount}`);
    console.log(`  - Documents updated: ${modifiedCount}`);
    console.log(`  - Estimated cost: $${estimatedCostUSD.toFixed(4)}`);
    console.log('');

    console.log('Next steps:');
    console.log('  1. Ensure vector index is active in MongoDB Atlas');
    console.log('  2. Test search: curl "http://localhost:3000/search?q=OC4IDS"');
    console.log('  3. Start API: npm run dev');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed');
  }
};

// Run seeder
const isQuickMode = process.argv.includes('--quick');
const limitResources = isQuickMode ? 3 : undefined;

if (isQuickMode) {
  console.log('🚀 Quick mode: Seeding first 3 resources only\n');
}

seedDatabase(limitResources)
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
