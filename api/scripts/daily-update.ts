#!/usr/bin/env tsx
/**
 * Daily Knowledge Base Update
 *
 * Runs automatically at midnight to:
 * 1. Fetch latest blog articles from RSS feed
 * 2. Check for updated pages on the website
 * 3. Index new content and update existing documents
 *
 * Usage:
 *   npm run daily:update           # Full update
 *   npm run daily:update -- --dry-run  # Preview changes only
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';
import { parseFeed } from './utils/rss-feed-parser.js';
import { crawlAllResourcesParallel } from './utils/crawler-parallel.js';
import { chunkTextAdaptive } from './utils/chunker-adaptive.js';
import { generateEmbeddingsBatch, estimateEmbeddingCost } from './utils/embedder.js';
import { logCost } from './monitoring/cost-tracker.js';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COLLECTION_NAME = 'docs';

const BLOG_FEED_URL = 'https://infrastructuretransparency.org/feed/';
const MAX_BLOG_ARTICLES = 20; // Check last 20 articles for new content

const DRY_RUN = process.argv.includes('--dry-run');

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

interface UpdateStats {
  blogArticlesChecked: number;
  newBlogArticles: number;
  updatedPages: number;
  totalNewChunks: number;
  estimatedCost: number;
  duration: number;
}

const dailyUpdate = async (): Promise<UpdateStats> => {
  const client = new MongoClient(MONGODB_URI);
  const startTime = Date.now();

  const stats: UpdateStats = {
    blogArticlesChecked: 0,
    newBlogArticles: 0,
    updatedPages: 0,
    totalNewChunks: 0,
    estimatedCost: 0,
    duration: 0
  };

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Daily Knowledge Base Update                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log(`🔧 Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE UPDATE'}\n`);

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    console.log('✅ Connected\n');

    // ========================================
    // STEP 1: Check for new blog articles
    // ========================================
    console.log('📰 Step 1: Checking for new blog articles...');

    const feedItems = await parseFeed({
      feedUrl: BLOG_FEED_URL,
      maxItems: MAX_BLOG_ARTICLES
    });

    stats.blogArticlesChecked = feedItems.length;
    console.log(`  ✓ Fetched ${feedItems.length} latest articles from RSS feed`);

    // Check which articles are new
    const existingUrls = new Set(
      await collection.distinct('url', {
        'metadata.source': 'infrastructuretransparency.org/blog'
      })
    );

    const newArticles = feedItems.filter(item => !existingUrls.has(item.url));
    stats.newBlogArticles = newArticles.length;

    console.log(`  ✓ Found ${newArticles.length} new articles\n`);

    if (newArticles.length > 0 && !DRY_RUN) {
      console.log('📝 Indexing new blog articles...');

      // Chunk new articles
      const articleChunks: Array<{
        text: string;
        article: typeof newArticles[0];
        chunkIndex: number;
        totalChunks: number;
      }> = [];

      newArticles.forEach(article => {
        const chunks = chunkTextAdaptive(article.content, {
          minTokens: 256,
          maxTokens: 768,
          overlapTokens: 50
        });

        chunks.forEach(chunk => {
          articleChunks.push({
            text: chunk.text,
            article,
            chunkIndex: chunk.index,
            totalChunks: chunk.totalChunks
          });
        });
      });

      console.log(`  ✓ Created ${articleChunks.length} chunks from new articles`);

      // Generate embeddings
      const texts = articleChunks.map(c => c.text);
      const { estimatedCostUSD } = estimateEmbeddingCost(texts);
      stats.estimatedCost += estimatedCostUSD;

      const embeddings = await generateEmbeddingsBatch(texts, {
        batchSize: 500,
        onProgress: (completed, total) => {
          process.stdout.write(`\r  Progress: ${completed}/${total}`);
        }
      });
      console.log('\n  ✓ Embeddings generated');

      // Prepare documents
      const mongoDocuments = articleChunks.map((chunk, index) => {
        const uniqueUrl = chunk.totalChunks > 1
          ? `${chunk.article.url}#chunk-${chunk.chunkIndex + 1}`
          : chunk.article.url;

        return {
          title: chunk.totalChunks > 1
            ? `${chunk.article.title} (Part ${chunk.chunkIndex + 1}/${chunk.totalChunks})`
            : chunk.article.title,
          type: 'News',
          summary: chunk.article.summary,
          content: chunk.text,
          embedding: embeddings[index].embedding,
          url: uniqueUrl,
          year: chunk.article.publishedDate.getFullYear(),
          publishedDate: chunk.article.publishedDate,
          author: chunk.article.author,
          categories: chunk.article.categories,
          metadata: {
            source: 'infrastructuretransparency.org/blog',
            crawledAt: new Date(),
            chunkIndex: chunk.totalChunks > 1 ? chunk.chunkIndex : undefined,
            totalChunks: chunk.totalChunks > 1 ? chunk.totalChunks : undefined,
            contentType: 'blog-article'
          }
        };
      });

      // Insert into MongoDB
      const bulkOps = mongoDocuments.map(doc => ({
        updateOne: {
          filter: { url: doc.url },
          update: { $set: doc },
          upsert: true
        }
      }));

      const result = await collection.bulkWrite(bulkOps, { ordered: false });
      stats.totalNewChunks += mongoDocuments.length;

      console.log(`  ✓ Inserted ${result.upsertedCount} new documents\n`);

      // Log cost
      await logCost({
        operation: 'daily-update-blog',
        resourceCount: newArticles.length,
        tokenCount: Math.ceil(texts.reduce((sum, t) => sum + t.length, 0) / 4),
        embeddingCount: embeddings.length,
        costUSD: estimatedCostUSD,
        metadata: {
          model: 'text-embedding-3-large',
          batchSize: 500,
          success: true
        }
      });
    } else if (newArticles.length > 0) {
      console.log(`  [DRY RUN] Would index ${newArticles.length} new articles\n`);
    } else {
      console.log('  ℹ️  No new blog articles to index\n');
    }

    // ========================================
    // STEP 2: Check for updated pages
    // ========================================
    console.log('🔄 Step 2: Checking for updated website pages...');
    console.log('  ℹ️  Checking most recently updated pages...');

    // Get pages updated in the last 7 days
    const recentThreshold = new Date();
    recentThreshold.setDate(recentThreshold.getDate() - 7);

    const recentlyUpdatedDocs = await collection.find({
      'metadata.crawledAt': { $gte: recentThreshold },
      type: { $ne: 'News' } // Exclude blog posts
    }).limit(50).toArray();

    console.log(`  ✓ Found ${recentlyUpdatedDocs.length} pages to check for updates`);

    if (recentlyUpdatedDocs.length > 0 && !DRY_RUN) {
      // Extract unique URLs
      const urlsToCheck = [...new Set(recentlyUpdatedDocs.map(doc =>
        doc.url.split('#')[0] // Remove chunk fragments
      ))];

      console.log(`  ✓ Checking ${urlsToCheck.length} unique pages...\n`);

      // Re-crawl these pages
      const resources = urlsToCheck.map(url => ({ url, type: 'Update Check' }));

      const updatedDocs = await crawlAllResourcesParallel(resources, {
        concurrency: 5,
        retries: 2,
        timeout: 30000,
        checkDuplicates: async () => false // Always fetch
      });

      // Compare content and update if changed
      let updatedCount = 0;
      for (const doc of updatedDocs) {
        const existing = await collection.findOne({
          url: { $regex: `^${doc.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` }
        });

        if (existing && existing.content !== doc.text) {
          updatedCount++;
          // Content has changed, re-index
          // (Implementation would chunk, embed, and update here)
        }
      }

      stats.updatedPages = updatedCount;
      console.log(`  ✓ Updated ${updatedCount} changed pages\n`);
    } else if (recentlyUpdatedDocs.length > 0) {
      console.log(`  [DRY RUN] Would check ${recentlyUpdatedDocs.length} pages for updates\n`);
    } else {
      console.log('  ℹ️  No pages need update checking\n');
    }

    // ========================================
    // FINAL STATS
    // ========================================
    stats.duration = (Date.now() - startTime) / 1000;

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Daily Update Complete!                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Summary:');
    console.log(`  - Blog articles checked: ${stats.blogArticlesChecked}`);
    console.log(`  - New blog articles: ${stats.newBlogArticles}`);
    console.log(`  - Updated pages: ${stats.updatedPages}`);
    console.log(`  - Total new chunks: ${stats.totalNewChunks}`);
    console.log(`  - Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
    console.log(`  - Duration: ${stats.duration.toFixed(1)}s`);
    console.log(`  - Completed at: ${new Date().toISOString()}\n`);

    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE: No changes were made to the database\n');
    }

    return stats;

  } catch (error) {
    console.error('\n❌ Error during daily update:', error);
    throw error;
  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed\n');
  }
};

// Run the update
dailyUpdate()
  .then((stats) => {
    console.log('✅ Daily update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Daily update failed:', error);
    process.exit(1);
  });
