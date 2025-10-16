#!/usr/bin/env tsx
/**
 * Seed from Auto-Discovered Resources
 *
 * Seeds the database with all discovered resources from a site
 *
 * Usage:
 *   npm run seed:discovered
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';
import { crawlAllResourcesParallel } from './utils/crawler-parallel.js';
import { chunkTextAdaptive } from './utils/chunker-adaptive.js';
import { generateEmbeddingsBatch, estimateEmbeddingCost } from './utils/embedder.js';
import { logCost } from './monitoring/cost-tracker.js';

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COLLECTION_NAME = 'docs';
const CONCURRENCY = 5;

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
    contentType?: string;
    tokenCount?: number;
  };
}

const seedDiscovered = async () => {
  const client = new MongoClient(MONGODB_URI);
  const startTime = Date.now();

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Seed from Discovered Resources                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Import discovered resources
    console.log('📂 Loading discovered resources...');
    const { DISCOVERED_RESOURCES } = await import('./resources/cost-site-discovered.js');

    console.log(`✅ Loaded ${DISCOVERED_RESOURCES.length} discovered resources\n`);

    console.log(`📊 Configuration:`);
    console.log(`  - Total resources: ${DISCOVERED_RESOURCES.length}`);
    console.log(`  - Concurrency: ${CONCURRENCY}`);
    console.log(`  - Embedding batch size: 500`);
    console.log(`  - Chunking: Adaptive (256-768 tokens)`);
    console.log('');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<MongoDocument>(COLLECTION_NAME);
    console.log('✅ Connected to MongoDB\n');

    // Duplicate check function
    const checkDuplicates = async (url: string): Promise<boolean> => {
      const exists = await collection.findOne({ url });
      return exists !== null;
    };

    // Step 1: Parallel crawling with duplicate prevention
    console.log('🕷️  Step 1: Crawling discovered pages in parallel...');
    const crawlStartTime = Date.now();

    const crawledDocs = await crawlAllResourcesParallel(DISCOVERED_RESOURCES, {
      concurrency: CONCURRENCY,
      retries: 3,
      timeout: 30000,
      delayMs: 1000,
      checkDuplicates
    });

    const crawlDuration = (Date.now() - crawlStartTime) / 1000;

    if (crawledDocs.length === 0) {
      console.log('\n✅ No new resources to index. All discovered pages already indexed!\n');
      return;
    }

    console.log(`✅ Crawled ${crawledDocs.length} new documents in ${crawlDuration.toFixed(1)}s\n`);

    // Log crawl cost
    await logCost({
      operation: 'crawl',
      resourceCount: crawledDocs.length,
      costUSD: 0,
      metadata: {
        duration: crawlDuration,
        success: true
      }
    });

    // Step 2: Adaptive chunking
    console.log('✂️  Step 2: Chunking with adaptive sizing...');
    const chunkStartTime = Date.now();

    const allChunks: Array<{
      docId: number;
      chunkIndex: number;
      totalChunks: number;
      text: string;
      contentType: string;
      tokenCount: number;
      doc: typeof crawledDocs[0];
    }> = [];

    crawledDocs.forEach((doc, docIndex) => {
      console.log(`\nProcessing: ${doc.title}`);

      const chunks = chunkTextAdaptive(doc.content, {
        contentType: 'auto',
        minTokens: 256,
        maxTokens: 768,
        overlap: 50,
        preserveContext: true
      });

      chunks.forEach(chunk => {
        allChunks.push({
          docId: docIndex,
          chunkIndex: chunk.index,
          totalChunks: chunk.totalChunks,
          text: chunk.text,
          contentType: chunk.contentType,
          tokenCount: chunk.tokenCount,
          doc
        });
      });
    });

    const chunkDuration = (Date.now() - chunkStartTime) / 1000;
    console.log(`\n✅ Created ${allChunks.length} adaptive chunks in ${chunkDuration.toFixed(1)}s\n`);

    // Step 3: Estimate cost
    console.log('💰 Step 3: Estimating embedding cost...');
    const texts = allChunks.map(c => c.text);
    const { approximateTokens, estimatedCostUSD } = estimateEmbeddingCost(texts);
    console.log(`  - Approximate tokens: ${approximateTokens.toLocaleString()}`);
    console.log(`  - Estimated cost: $${estimatedCostUSD.toFixed(4)}`);
    console.log('');

    // Step 4: Generate embeddings
    console.log('🧮 Step 4: Generating embeddings (batch size: 500)...');
    const embedStartTime = Date.now();

    const embeddings = await generateEmbeddingsBatch(texts, {
      batchSize: 500,  // Conservative size for large content to stay under 300k token limit
      onProgress: (completed, total) => {
        const percent = ((completed / total) * 100).toFixed(1);
        process.stdout.write(`\r  Progress: ${completed}/${total} (${percent}%)`);
      }
    });

    const embedDuration = (Date.now() - embedStartTime) / 1000;
    console.log(`\n✅ Embeddings generated in ${embedDuration.toFixed(1)}s\n`);

    // Log embedding cost
    await logCost({
      operation: 'embed',
      resourceCount: crawledDocs.length,
      tokenCount: approximateTokens,
      embeddingCount: embeddings.length,
      costUSD: estimatedCostUSD,
      metadata: {
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
        batchSize: 500,  // Conservative size for large content
        duration: embedDuration,
        success: true
      }
    });

    // Step 5: Prepare documents
    console.log('📦 Step 5: Preparing MongoDB documents...');
    const mongoDocuments: MongoDocument[] = allChunks.map((chunk, index) => {
      // Make URL unique for each chunk by adding fragment
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
        url: uniqueUrl,  // Unique URL per chunk
        country: chunk.doc.country,
        year: chunk.doc.year,
        metadata: {
          source: chunk.doc.metadata.source,
          crawledAt: chunk.doc.metadata.crawledAt,
          chunkIndex: chunk.totalChunks > 1 ? chunk.chunkIndex : undefined,
          totalChunks: chunk.totalChunks > 1 ? chunk.totalChunks : undefined,
          contentType: chunk.contentType,
          tokenCount: chunk.tokenCount
        }
      };
    });

    console.log(`✅ Prepared ${mongoDocuments.length} documents\n`);

    // Step 6: Insert into MongoDB
    console.log('💾 Step 6: Inserting into MongoDB...');
    const insertResult = await collection.insertMany(mongoDocuments);
    console.log(`✅ Inserted ${insertResult.insertedCount} documents\n`);

    // Step 7: Statistics
    const totalDocs = await collection.countDocuments();
    const uniqueUrls = (await collection.distinct('url')).length;
    const totalDuration = (Date.now() - startTime) / 1000;

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Discovered Site Seeding Complete!                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log(`  - Resources crawled: ${crawledDocs.length}`);
    console.log(`  - Chunks created: ${allChunks.length}`);
    console.log(`  - Embeddings generated: ${embeddings.length}`);
    console.log(`  - Documents inserted: ${insertResult.insertedCount}`);
    console.log(`  - Total duration: ${totalDuration.toFixed(1)}s`);
    console.log(`  - Estimated cost: $${estimatedCostUSD.toFixed(4)}`);
    console.log('');

    console.log('Database totals:');
    console.log(`  - Total documents: ${totalDocs}`);
    console.log(`  - Unique URLs: ${uniqueUrls}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error);

    await logCost({
      operation: 'embed',
      resourceCount: 0,
      costUSD: 0,
      metadata: {
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });

    throw error;
  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed');
  }
};

seedDiscovered()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
