#!/usr/bin/env tsx
/**
 * Seed Blog/News from RSS Feed
 *
 * Crawls the CoST blog RSS feed and indexes all articles
 * Enables "latest news" searches with publication dates
 *
 * Usage:
 *   npm run seed:blog           # Seed all blog articles
 *   npm run seed:blog --latest  # Only latest 50 articles
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';
import { parseFeed } from './utils/rss-feed-parser.js';
import { chunkTextAdaptive } from './utils/chunker-adaptive.js';
import { generateEmbeddingsBatch, estimateEmbeddingCost } from './utils/embedder.js';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COLLECTION_NAME = 'docs';

// CoST Blog RSS Feed
const BLOG_FEED_URL = 'https://infrastructuretransparency.org/feed/';
const LATEST_ONLY = process.argv.includes('--latest');
const MAX_ARTICLES = LATEST_ONLY ? 50 : undefined;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

interface MongoDocument {
  title: string;
  type: string;
  summary: string;
  content: string;
  embedding: number[];
  url: string;
  year?: number;
  publishedDate?: Date;
  author?: string;
  categories?: string[];
  metadata: {
    source: string;
    crawledAt: Date;
    chunkIndex?: number;
    totalChunks?: number;
    contentType?: string;
  };
}

const seedBlogRSS = async () => {
  const client = new MongoClient(MONGODB_URI);
  const startTime = Date.now();

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Seed Blog/News from RSS Feed                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`📰 Blog Feed: ${BLOG_FEED_URL}`);
    console.log(`📊 Mode: ${LATEST_ONLY ? 'Latest 50 articles' : 'All articles'}\n`);

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<MongoDocument>(COLLECTION_NAME);
    console.log('✅ Connected\n');

    // Fetch RSS feed
    console.log('📡 Fetching RSS feed...');
    const feedItems = await parseFeed({
      feedUrl: BLOG_FEED_URL,
      maxItems: MAX_ARTICLES
    });

    if (feedItems.length === 0) {
      console.log('❌ No articles found in feed\n');
      return;
    }

    console.log(`✅ Found ${feedItems.length} articles\n`);

    // Check for existing articles
    console.log('🔍 Checking for existing articles...');
    const existingUrls = new Set(await collection.distinct('url'));
    const newArticles = feedItems.filter(item => !existingUrls.has(item.url));

    console.log(`  - Total in feed: ${feedItems.length}`);
    console.log(`  - Already indexed: ${feedItems.length - newArticles.length}`);
    console.log(`  - New articles: ${newArticles.length}\n`);

    if (newArticles.length === 0) {
      console.log('✅ All articles already indexed!\n');
      return;
    }

    // Chunk articles
    console.log('✂️  Chunking articles...');
    const allChunks: Array<{
      articleIndex: number;
      chunkIndex: number;
      totalChunks: number;
      text: string;
      article: typeof newArticles[0];
    }> = [];

    newArticles.forEach((article, idx) => {
      const chunks = chunkTextAdaptive(article.content, {
        minTokens: 256,
        maxTokens: 768,
        overlapTokens: 50
      });

      chunks.forEach(chunk => {
        allChunks.push({
          articleIndex: idx,
          chunkIndex: chunk.index,
          totalChunks: chunk.totalChunks,
          text: chunk.text,
          article
        });
      });

      console.log(`  - ${article.title.slice(0, 60)}...: ${chunks.length} chunks`);
    });

    console.log(`✅ Created ${allChunks.length} chunks\n`);

    // Estimate cost
    console.log('💰 Estimating cost...');
    const texts = allChunks.map(c => c.text);
    const { approximateTokens, estimatedCostUSD } = estimateEmbeddingCost(texts);
    console.log(`  - Tokens: ${approximateTokens.toLocaleString()}`);
    console.log(`  - Cost: $${estimatedCostUSD.toFixed(4)}\n`);

    // Generate embeddings
    console.log('🧮 Generating embeddings...');
    const embeddings = await generateEmbeddingsBatch(texts, {
      onProgress: (completed, total) => {
        const percent = ((completed / total) * 100).toFixed(1);
        process.stdout.write(`\r  Progress: ${completed}/${total} (${percent}%)`);
      }
    });
    console.log('\n✅ Embeddings generated\n');

    // Prepare documents
    console.log('📦 Preparing documents...');
    const mongoDocuments: MongoDocument[] = allChunks.map((chunk, index) => {
      const uniqueUrl = chunk.totalChunks > 1
        ? `${chunk.article.url}#chunk-${chunk.chunkIndex + 1}`
        : chunk.article.url;

      return {
        title: chunk.totalChunks > 1
          ? `${chunk.article.title} (Part ${chunk.chunkIndex + 1}/${chunk.totalChunks})`
          : chunk.article.title,
        type: 'News',  // All blog articles categorized as News
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

    console.log(`✅ Prepared ${mongoDocuments.length} documents\n`);

    // Insert with upsert
    console.log('💾 Inserting into MongoDB...');
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

    console.log(`✅ Upserted ${upsertedCount}, Updated ${modifiedCount}\n`);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Blog Seeding Complete!                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('Summary:');
    console.log(`  - New articles: ${newArticles.length}`);
    console.log(`  - Total chunks: ${allChunks.length}`);
    console.log(`  - Documents inserted: ${upsertedCount}`);
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Cost: $${estimatedCostUSD.toFixed(4)}\n`);

    console.log('🔍 Test searches:');
    console.log('  - "latest news"');
    console.log('  - "recent updates"');
    console.log('  - "blog 2025"\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed');
  }
};

seedBlogRSS()
  .then(() => {
    console.log('✅ Completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
