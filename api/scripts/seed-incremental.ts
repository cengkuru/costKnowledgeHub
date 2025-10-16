#!/usr/bin/env tsx
/**
 * Incremental MongoDB Seeder - Prevents Double Indexing
 *
 * Only processes NEW resources that aren't already in the database
 * Checks URLs before crawling to avoid duplicate work and costs
 *
 * Usage:
 *   npm run seed:incremental              # Add only new resources
 *   npm run seed:incremental -- --force   # Force re-index specific URLs
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';
import { crawlAllResourcesParallel } from './utils/crawler-parallel.js';
import { chunkText } from './utils/chunker.js';
import { generateEmbeddingsBatch, estimateEmbeddingCost } from './utils/embedder.js';
import { COST_RESOURCES } from './utils/crawler.js';

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COLLECTION_NAME = 'docs';
const CONCURRENCY = 5; // Parallel crawl limit

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
    lastUpdated?: Date;
  };
}

/**
 * Incremental seeding with duplicate prevention
 */
const seedIncremental = async (forceReindex: boolean = false) => {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  CoST Knowledge Hub - Incremental Seeder                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<MongoDocument>(COLLECTION_NAME);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Check for existing URLs
    console.log('🔍 Step 1: Identifying new resources...');
    const existingUrls = await collection.distinct('url');
    console.log(`  - Existing URLs in database: ${existingUrls.length}`);
    console.log(`  - Total resources to check: ${COST_RESOURCES.length}`);

    // Duplicate check function
    const checkDuplicates = async (url: string): Promise<boolean> => {
      if (forceReindex) return false; // Force re-index all
      return existingUrls.includes(url);
    };

    // Step 2: Crawl only new resources in parallel
    console.log('\n🕷️  Step 2: Crawling new resources in parallel...');
    const crawledDocs = await crawlAllResourcesParallel(COST_RESOURCES, {
      concurrency: CONCURRENCY,
      retries: 3,
      timeout: 30000,
      delayMs: 1000,
      checkDuplicates,
      onProgress: (completed, total, current) => {
        const percent = ((completed / total) * 100).toFixed(1);
        process.stdout.write(`\r  Progress: ${completed}/${total} (${percent}%) - ${current.slice(0, 50)}...`);
      }
    });

    if (crawledDocs.length === 0) {
      console.log('\n✅ No new resources to index. Database is up to date!\n');
      return;
    }

    console.log(`\n✅ Crawled ${crawledDocs.length} new documents\n`);

    // Step 3: Chunk documents
    console.log('✂️  Step 3: Chunking documents...');
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

    // Step 4: Estimate cost
    console.log('💰 Step 4: Estimating embedding cost...');
    const texts = allChunks.map(c => c.text);
    const { approximateTokens, estimatedCostUSD } = estimateEmbeddingCost(texts);
    console.log(`  - Approximate tokens: ${approximateTokens.toLocaleString()}`);
    console.log(`  - Estimated cost: $${estimatedCostUSD.toFixed(4)}`);
    console.log('');

    // Step 5: Generate embeddings
    console.log('🧮 Step 5: Generating embeddings...');
    const embeddings = await generateEmbeddingsBatch(texts, {
      onProgress: (completed, total) => {
        const percent = ((completed / total) * 100).toFixed(1);
        process.stdout.write(`\r  Progress: ${completed}/${total} (${percent}%)`);
      }
    });
    console.log('\n✅ Embeddings generated\n');

    // Step 6: Prepare documents
    console.log('📦 Step 6: Preparing documents...');
    const mongoDocuments: MongoDocument[] = allChunks.map((chunk, index) => ({
      title: chunk.totalChunks > 1
        ? `${chunk.doc.title} (Part ${chunk.chunkIndex + 1}/${chunk.totalChunks})`
        : chunk.doc.title,
      type: chunk.doc.type,
      summary: chunk.doc.summary,
      content: chunk.text,
      embedding: embeddings[index].embedding,
      url: chunk.doc.url,
      country: chunk.doc.country,
      year: chunk.doc.year,
      metadata: {
        source: chunk.doc.metadata.source,
        crawledAt: chunk.doc.metadata.crawledAt,
        chunkIndex: chunk.totalChunks > 1 ? chunk.chunkIndex : undefined,
        totalChunks: chunk.totalChunks > 1 ? chunk.totalChunks : undefined,
        lastUpdated: new Date()
      }
    }));

    console.log(`✅ Prepared ${mongoDocuments.length} documents\n`);

    // Step 7: Insert into MongoDB
    console.log('💾 Step 7: Inserting into MongoDB...');
    const insertResult = await collection.insertMany(mongoDocuments);
    console.log(`✅ Inserted ${insertResult.insertedCount} documents\n`);

    // Step 8: Statistics
    const totalDocs = await collection.countDocuments();
    const uniqueUrls = (await collection.distinct('url')).length;

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Incremental Seeding Complete!                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log(`  - New documents crawled: ${crawledDocs.length}`);
    console.log(`  - New chunks created: ${allChunks.length}`);
    console.log(`  - New embeddings generated: ${embeddings.length}`);
    console.log(`  - Documents inserted: ${insertResult.insertedCount}`);
    console.log(`  - Estimated cost: $${estimatedCostUSD.toFixed(4)}`);
    console.log('');

    console.log('Database totals:');
    console.log(`  - Total documents: ${totalDocs}`);
    console.log(`  - Unique URLs: ${uniqueUrls}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during incremental seeding:', error);
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

seedIncremental(forceReindex)
  .then(() => {
    console.log('✅ Incremental seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Incremental seeding failed:', error);
    process.exit(1);
  });
