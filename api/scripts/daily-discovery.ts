#!/usr/bin/env tsx
/**
 * Daily Discovery and Incremental Indexing
 *
 * Discovers new pages from CoST website and indexes only new content
 * Designed to run daily via cron job or GitHub Actions
 *
 * Features:
 * - Discovers new pages from infrastructuretransparency.org
 * - Only crawls and indexes pages not already in database
 * - Logs all operations for monitoring
 * - Sends summary report
 *
 * Usage:
 *   npm run daily:discovery
 *   npm run daily:discovery -- --dry-run  # Preview without indexing
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';
import { discoverPages } from './utils/sitemap-crawler.js';
import { crawlAllResourcesParallel } from './utils/crawler-parallel.js';
import { chunkTextAdaptive } from './utils/chunker-adaptive.js';
import { generateEmbeddingsBatch, estimateEmbeddingCost } from './utils/embedder.js';
import { logCost } from './monitoring/cost-tracker.js';

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COLLECTION_NAME = 'docs';
const COST_WEBSITE = 'https://infrastructuretransparency.org';
const DRY_RUN = process.argv.includes('--dry-run');

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

const dailyDiscovery = async () => {
  const client = new MongoClient(MONGODB_URI);
  const startTime = Date.now();

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Daily Discovery & Incremental Indexing                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No indexing will be performed\n');
    }

    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`🌐 Target: ${COST_WEBSITE}\n`);

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<MongoDocument>(COLLECTION_NAME);
    console.log('✅ Connected to MongoDB\n');

    // Get existing URLs
    console.log('📊 Fetching existing URLs from database...');
    const existingUrls = new Set(await collection.distinct('url'));
    const baseUrlsWithoutChunks = new Set(
      Array.from(existingUrls).map(url => url.split('#')[0])
    );
    console.log(`  - Existing documents: ${existingUrls.size}`);
    console.log(`  - Unique base URLs: ${baseUrlsWithoutChunks.size}\n`);

    // Step 1: Discover all pages
    console.log('🔍 Step 1: Discovering pages on website...');
    const discoveryStartTime = Date.now();

    const discoveredPages = await discoverPages({
      baseUrl: COST_WEBSITE,
      maxDepth: 3,
      maxPages: 300,
      excludePatterns: [
        /\/wp-admin\//,
        /\/wp-content\//,
        /\/wp-includes\//,
        /\.(jpg|jpeg|png|gif|pdf|zip|doc|docx|xls|xlsx)$/i,
        /\/feed\//,
        /\/cart\//,
        /\/checkout\//,
        /\?page=\d+/,  // Pagination
        /#/,           // Anchors
      ]
    });

    const discoveryDuration = (Date.now() - discoveryStartTime) / 1000;
    console.log(`✅ Discovered ${discoveredPages.length} pages in ${discoveryDuration.toFixed(1)}s\n`);

    // Step 2: Filter new pages
    console.log('🆕 Step 2: Filtering new pages...');
    const newPages = discoveredPages.filter(page => !baseUrlsWithoutChunks.has(page.url));

    console.log(`  - Total discovered: ${discoveredPages.length}`);
    console.log(`  - Already indexed: ${discoveredPages.length - newPages.length}`);
    console.log(`  - New pages: ${newPages.length}\n`);

    if (newPages.length === 0) {
      console.log('✅ No new pages to index. Database is up to date!\n');

      // Log the check
      await logCost({
        operation: 'discovery',
        resourceCount: discoveredPages.length,
        costUSD: 0,
        metadata: {
          newPagesFound: 0,
          duration: discoveryDuration,
          success: true
        }
      });

      return;
    }

    if (DRY_RUN) {
      console.log('📋 NEW PAGES DISCOVERED (DRY RUN):');
      newPages.forEach((page, i) => {
        console.log(`  ${i + 1}. [${page.type}] ${page.title}`);
        console.log(`     ${page.url}`);
      });
      console.log(`\n✅ DRY RUN COMPLETE - No indexing performed\n`);
      return;
    }

    // Step 3: Crawl new pages
    console.log('🕷️  Step 3: Crawling new pages...');
    const crawlStartTime = Date.now();

    const crawledDocs = await crawlAllResourcesParallel(newPages, {
      concurrency: 5,
      retries: 3,
      timeout: 30000,
      delayMs: 1000,
    });

    const crawlDuration = (Date.now() - crawlStartTime) / 1000;
    console.log(`✅ Crawled ${crawledDocs.length} documents in ${crawlDuration.toFixed(1)}s\n`);

    // Step 4: Adaptive chunking
    console.log('✂️  Step 4: Chunking with adaptive sizing...');
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
    console.log(`✅ Created ${allChunks.length} adaptive chunks in ${chunkDuration.toFixed(1)}s\n`);

    // Step 5: Estimate cost
    console.log('💰 Step 5: Estimating embedding cost...');
    const texts = allChunks.map(c => c.text);
    const { approximateTokens, estimatedCostUSD } = estimateEmbeddingCost(texts);
    console.log(`  - Approximate tokens: ${approximateTokens.toLocaleString()}`);
    console.log(`  - Estimated cost: $${estimatedCostUSD.toFixed(4)}\n`);

    // Step 6: Generate embeddings
    console.log('🧮 Step 6: Generating embeddings...');
    const embedStartTime = Date.now();

    const embeddings = await generateEmbeddingsBatch(texts, {
      batchSize: 2000,
      onProgress: (completed, total) => {
        const percent = ((completed / total) * 100).toFixed(1);
        process.stdout.write(`\r  Progress: ${completed}/${total} (${percent}%)`);
      }
    });

    const embedDuration = (Date.now() - embedStartTime) / 1000;
    console.log(`\n✅ Embeddings generated in ${embedDuration.toFixed(1)}s\n`);

    // Step 7: Prepare documents
    console.log('📦 Step 7: Preparing MongoDB documents...');
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
          totalChunks: chunk.totalChunks > 1 ? chunk.totalChunks : undefined,
          contentType: chunk.contentType,
          tokenCount: chunk.tokenCount
        }
      };
    });

    console.log(`✅ Prepared ${mongoDocuments.length} documents\n`);

    // Step 8: Insert into MongoDB
    console.log('💾 Step 8: Inserting into MongoDB...');
    const insertResult = await collection.insertMany(mongoDocuments);
    console.log(`✅ Inserted ${insertResult.insertedCount} documents\n`);

    // Log operation
    await logCost({
      operation: 'daily-discovery',
      resourceCount: crawledDocs.length,
      tokenCount: approximateTokens,
      embeddingCount: embeddings.length,
      costUSD: estimatedCostUSD,
      metadata: {
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
        newPagesFound: newPages.length,
        crawlDuration,
        embedDuration,
        success: true
      }
    });

    // Summary
    const totalDuration = (Date.now() - startTime) / 1000;
    const totalDocs = await collection.countDocuments();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Daily Discovery Complete!                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log(`  - Pages discovered: ${discoveredPages.length}`);
    console.log(`  - New pages found: ${newPages.length}`);
    console.log(`  - Documents crawled: ${crawledDocs.length}`);
    console.log(`  - Chunks created: ${allChunks.length}`);
    console.log(`  - Embeddings generated: ${embeddings.length}`);
    console.log(`  - Documents inserted: ${insertResult.insertedCount}`);
    console.log(`  - Total duration: ${totalDuration.toFixed(1)}s`);
    console.log(`  - Estimated cost: $${estimatedCostUSD.toFixed(4)}`);
    console.log('');

    console.log('Database totals:');
    console.log(`  - Total documents: ${totalDocs}`);
    console.log(`  - Growth: +${insertResult.insertedCount} documents`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during daily discovery:', error);

    await logCost({
      operation: 'daily-discovery',
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

dailyDiscovery()
  .then(() => {
    console.log('✅ Daily discovery completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Daily discovery failed:', error);
    process.exit(1);
  });
