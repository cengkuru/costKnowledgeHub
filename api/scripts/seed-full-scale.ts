#!/usr/bin/env tsx
/**
 * Full-Scale MongoDB Seeder with All Optimizations
 *
 * Features:
 * - Parallel crawling (5 concurrent requests)
 * - Adaptive chunking based on content type
 * - Optimized batch embedding (2000 per batch)
 * - Duplicate prevention via URL checking
 * - Cost tracking and monitoring
 * - 50+ CoST resources from multiple categories
 *
 * Usage:
 *   npm run seed:full              # Seed all 50+ resources
 *   npm run seed:full -- --force   # Force re-index all
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';
import { crawlAllResourcesParallel } from './utils/crawler-parallel.js';
import { chunkTextAdaptive } from './utils/chunker-adaptive.js';
import { generateEmbeddingsBatch, estimateEmbeddingCost } from './utils/embedder.js';
import { ALL_EXPANDED_RESOURCES } from './resources/cost-resources-expanded.js';
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

/**
 * Full-scale seeding with all optimizations
 */
const seedFullScale = async (forceReindex: boolean = false) => {
  const client = new MongoClient(MONGODB_URI);
  const startTime = Date.now();

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  CoST Knowledge Hub - Full-Scale Seeder                   ║');
    console.log('║  With Parallel Processing & Adaptive Chunking             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Configuration:`);
    console.log(`  - Total resources: ${ALL_EXPANDED_RESOURCES.length}`);
    console.log(`  - Concurrency: ${CONCURRENCY}`);
    console.log(`  - Embedding batch size: 2000`);
    console.log(`  - Chunking: Adaptive (256-768 tokens)`);
    console.log(`  - Duplicate prevention: ${!forceReindex ? 'Enabled' : 'Disabled (force mode)'}`);
    console.log('');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<MongoDocument>(COLLECTION_NAME);
    console.log('✅ Connected to MongoDB\n');

    // Duplicate check function
    const checkDuplicates = async (url: string): Promise<boolean> => {
      if (forceReindex) return false;
      const exists = await collection.findOne({ url });
      return exists !== null;
    };

    // Step 1: Parallel crawling with duplicate prevention
    console.log('🕷️  Step 1: Crawling resources in parallel...');
    const crawlStartTime = Date.now();

    const crawledDocs = await crawlAllResourcesParallel(ALL_EXPANDED_RESOURCES, {
      concurrency: CONCURRENCY,
      retries: 3,
      timeout: 30000,
      delayMs: 1000,
      checkDuplicates,
      onProgress: (completed, total, current) => {
        // Progress updates handled in crawler
      }
    });

    const crawlDuration = (Date.now() - crawlStartTime) / 1000;

    if (crawledDocs.length === 0) {
      console.log('\n✅ No new resources to index. Database is up to date!\n');
      return;
    }

    console.log(`✅ Crawled ${crawledDocs.length} documents in ${crawlDuration.toFixed(1)}s\n`);

    // Log crawl cost (negligible, but tracked for completeness)
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

    // Budget check
    if (estimatedCostUSD > 1.0) {
      console.warn(`\n⚠️  WARNING: Cost estimate exceeds $1.00`);
      console.warn('   Consider running in batches or reducing resources');
    }

    console.log('');

    // Step 4: Generate embeddings (optimized batching)
    console.log('🧮 Step 4: Generating embeddings (batch size: 2000)...');
    const embedStartTime = Date.now();

    const embeddings = await generateEmbeddingsBatch(texts, {
      batchSize: 2000, // Maximum OpenAI allows
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
        batchSize: 2000,
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
    console.log('║  ✅ Full-Scale Seeding Complete!                           ║');
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
    console.log(`  - Coverage: ${((uniqueUrls / ALL_EXPANDED_RESOURCES.length) * 100).toFixed(1)}%`);
    console.log('');

    console.log('Performance metrics:');
    console.log(`  - Avg crawl time: ${(crawlDuration / crawledDocs.length).toFixed(2)}s/doc`);
    console.log(`  - Avg embed time: ${(embedDuration / embeddings.length).toFixed(2)}s/embedding`);
    console.log(`  - Overall throughput: ${(crawledDocs.length / totalDuration).toFixed(2)} docs/s`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during full-scale seeding:', error);

    // Log failed operation
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

// Run seeder
const forceReindex = process.argv.includes('--force');

if (forceReindex) {
  console.log('⚠️  Force mode: Re-indexing all resources\n');
}

seedFullScale(forceReindex)
  .then(() => {
    console.log('✅ Full-scale seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Full-scale seeding failed:', error);
    process.exit(1);
  });
