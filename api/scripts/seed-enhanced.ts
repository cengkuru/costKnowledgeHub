#!/usr/bin/env tsx
/**
 * Enhanced MongoDB Seeder with Blog/News Support
 *
 * Features:
 * - Automatically detects blog/news content from discovered URLs
 * - Extracts publication dates, authors, tags
 * - Supports historical content flagging
 * - Enhanced metadata for better search
 *
 * Usage:
 *   npm run seed:enhanced
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';
import { crawlBlogArticlesParallel } from './utils/blog-crawler.js';
import { crawlAllResourcesParallel } from './utils/crawler-parallel.js';
import { chunkTextAdaptive } from './utils/chunker-adaptive.js';
import { generateEmbeddingsBatch, estimateEmbeddingCost } from './utils/embedder.js';

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COLLECTION_NAME = 'docs';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

interface EnhancedMongoDocument {
  title: string;
  type: string;
  summary: string;
  content: string;
  embedding: number[];
  url: string;
  country?: string;
  year?: number;
  publishedDate?: Date;
  author?: string;
  tags?: string[];
  wordCount?: number;
  readingTime?: number;
  excerpt?: string;
  isHistorical?: boolean;
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
 * Detect if URL is a blog or news article
 */
const isBlogOrNews = (url: string): boolean => {
  return url.includes('/blog/') ||
         url.includes('/news/') ||
         /\/\d{4}\/\d{2}\/\d{2}\//.test(url); // Date pattern like /2025/10/07/
};

/**
 * Extract year from published date or URL
 */
const extractYear = (publishedDate?: Date, url?: string): number | undefined => {
  if (publishedDate) {
    return publishedDate.getFullYear();
  }

  if (url) {
    const match = url.match(/\/(\d{4})\//);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return new Date().getFullYear(); // Default to current year
};

/**
 * Enhanced seeding with blog/news support
 */
const seedEnhanced = async () => {
  const client = new MongoClient(MONGODB_URI);
  const startTime = Date.now();

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  CoST Knowledge Hub - Enhanced Seeder                     ║');
    console.log('║  With Blog/News Support & Date Extraction                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<EnhancedMongoDocument>(COLLECTION_NAME);
    console.log('✅ Connected to MongoDB\n');

    // Load discovered URLs
    console.log('📂 Loading discovered URLs...');
    let discoveredUrls: string[] = [];
    try {
      const { DISCOVERED_RESOURCES } = await import('./resources/cost-site-discovered.js');
      discoveredUrls = DISCOVERED_RESOURCES.map((r: any) => r.url);
      console.log(`✅ Loaded ${discoveredUrls.length} discovered URLs\n`);
    } catch (error) {
      console.warn('⚠️  No discovered URLs found. Run: npm run discover:cost first\n');
      console.log('📝 Using default URLs from crawler.ts...');
      const { COST_RESOURCES } = await import('./utils/crawler.js');
      discoveredUrls = COST_RESOURCES.map(r => r.url);
    }

    // Separate blog/news from regular content
    const blogNewsUrls = discoveredUrls.filter(isBlogOrNews);
    const regularUrls = discoveredUrls.filter(url => !isBlogOrNews(url));

    console.log(`📊 Content breakdown:`);
    console.log(`  - Blog/News articles: ${blogNewsUrls.length}`);
    console.log(`  - Regular pages: ${regularUrls.length}`);
    console.log(`  - Total: ${discoveredUrls.length}\n`);

    const allDocuments: EnhancedMongoDocument[] = [];

    // Step 1: Crawl blog/news with enhanced metadata
    if (blogNewsUrls.length > 0) {
      console.log('📰 Step 1: Crawling blog/news articles...');
      const articles = await crawlBlogArticlesParallel(blogNewsUrls, 5);

      console.log(`✂️  Chunking ${articles.length} articles...`);
      for (const article of articles) {
        const chunks = chunkTextAdaptive(article.content, {
          minTokens: 256,
          maxTokens: 512,
          overlap: 64,
          type: article.type
        });

        chunks.forEach((chunk, idx) => {
          allDocuments.push({
            title: `${article.title}${chunks.length > 1 ? ` (Part ${idx + 1}/${chunks.length})` : ''}`,
            type: article.type,
            summary: article.excerpt || chunk.text.slice(0, 200),
            content: chunk.text,
            embedding: [], // Will be filled later
            url: `${article.url}#chunk-${idx + 1}`,
            year: extractYear(article.publishedDate, article.url),
            publishedDate: article.publishedDate,
            author: article.author,
            tags: article.tags,
            wordCount: article.metadata.wordCount,
            readingTime: article.metadata.readingTimeMinutes,
            excerpt: article.excerpt,
            isHistorical: article.publishedDate ? article.publishedDate.getFullYear() < 2024 : false,
            metadata: {
              source: article.metadata.source,
              crawledAt: article.metadata.crawledAt,
              chunkIndex: idx,
              totalChunks: chunks.length,
              contentType: article.type,
              tokenCount: chunk.tokenCount
            }
          });
        });
      }
      console.log(`✅ Prepared ${allDocuments.length} blog/news chunks\n`);
    }

    // Step 2: Crawl regular pages
    if (regularUrls.length > 0) {
      console.log('📚 Step 2: Crawling regular pages...');
      const regularResources = regularUrls.map(url => ({
        url,
        title: url.split('/').pop()?.replace(/-/g, ' ') || 'Resource',
        type: 'Resource' as const,
        summary: `Resource from ${new URL(url).hostname}`,
        year: new Date().getFullYear()
      }));

      const regularDocs = await crawlAllResourcesParallel(regularResources, {
        concurrency: 5
      });

      console.log(`✂️  Chunking ${regularDocs.length} regular documents...`);
      for (const doc of regularDocs) {
        const chunks = chunkTextAdaptive(doc.content, {
          minTokens: 512,
          maxTokens: 768,
          overlap: 128,
          type: doc.type
        });

        chunks.forEach((chunk, idx) => {
          allDocuments.push({
            title: `${doc.title}${chunks.length > 1 ? ` (Part ${idx + 1}/${chunks.length})` : ''}`,
            type: doc.type,
            summary: doc.summary,
            content: chunk.text,
            embedding: [],
            url: `${doc.url}#chunk-${idx + 1}`,
            country: doc.country,
            year: doc.year,
            metadata: {
              source: doc.metadata.source,
              crawledAt: doc.metadata.crawledAt,
              chunkIndex: idx,
              totalChunks: chunks.length,
              tokenCount: chunk.tokenCount
            }
          });
        });
      }
      console.log(`✅ Prepared ${allDocuments.length} total chunks\n`);
    }

    // Step 3: Generate embeddings
    console.log(`🧮 Step 3: Generating embeddings for ${allDocuments.length} chunks...`);
    const texts = allDocuments.map(doc => doc.content);

    const costEstimate = estimateEmbeddingCost(texts);
    console.log(`💰 Estimated tokens: ${costEstimate.approximateTokens.toLocaleString()}`);
    console.log(`💰 Estimated cost: $${costEstimate.estimatedCostUSD.toFixed(4)}\n`);

    const embeddings = await generateEmbeddingsBatch(texts, {
      batchSize: 100,  // Reduced batch size to stay under 300k token limit
      showProgress: true
    });

    allDocuments.forEach((doc, idx) => {
      doc.embedding = embeddings[idx];
    });
    console.log('✅ Embeddings generated\n');

    // Step 4: Upsert to MongoDB
    console.log('💾 Step 4: Upserting to MongoDB...');
    let updated = 0;
    let matched = 0;

    for (const doc of allDocuments) {
      const result = await collection.updateOne(
        { url: doc.url },
        { $set: doc },
        { upsert: true }
      );
      if (result.modifiedCount > 0) updated++;
      if (result.matchedCount > 0) matched++;
    }

    console.log(`✅ Upserted ${allDocuments.length} documents (updated: ${updated}, matched: ${matched})\n`);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Enhanced Seeding Complete!                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log(`  - Blog/News articles: ${blogNewsUrls.length}`);
    console.log(`  - Regular pages: ${regularUrls.length}`);
    console.log(`  - Total chunks: ${allDocuments.length}`);
    console.log(`  - With publication dates: ${allDocuments.filter(d => d.publishedDate).length}`);
    console.log(`  - Historical content: ${allDocuments.filter(d => d.isHistorical).length}`);
    console.log(`  - Estimated cost: $${estimatedCost.toFixed(4)}`);
    console.log(`  - Duration: ${duration}s\n`);

    console.log('Next steps:');
    console.log('  1. Test search: curl "http://localhost:3000/search?q=latest%20news&sortBy=date"');
    console.log('  2. Test historical: curl "http://localhost:3000/search?q=infrastructure&yearFrom=2020&yearTo=2023"');
    console.log('  3. Start API: npm run dev\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed');
  }
};

seedEnhanced().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
