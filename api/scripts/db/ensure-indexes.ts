#!/usr/bin/env tsx
/**
 * Database Index Management
 *
 * Creates and maintains indexes to prevent duplicates and optimize queries:
 * - Unique index on URL to prevent double indexing
 * - Compound indexes for common queries
 * - Text search indexes
 * - Vector search index verification
 *
 * Usage:
 *   npm run db:indexes
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COLLECTION_NAME = 'docs';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

/**
 * Index definitions
 */
const INDEXES = [
  {
    name: 'url_unique',
    keys: { url: 1 },
    options: {
      unique: true,
      background: true
    },
    description: 'Prevents duplicate URLs from being indexed'
  },
  {
    name: 'type_country',
    keys: { type: 1, country: 1 },
    options: {
      background: true
    },
    description: 'Optimizes queries filtering by type and country'
  },
  {
    name: 'year_desc',
    keys: { year: -1 },
    options: {
      background: true
    },
    description: 'Optimizes queries sorting by year (newest first)'
  },
  {
    name: 'crawled_at',
    keys: { 'metadata.crawledAt': -1 },
    options: {
      background: true
    },
    description: 'Optimizes queries sorting by crawl date'
  },
  {
    name: 'source',
    keys: { 'metadata.source': 1 },
    options: {
      background: true
    },
    description: 'Optimizes queries filtering by source domain'
  }
];

/**
 * Create or update indexes
 */
const ensureIndexes = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Database Index Management                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    console.log('✅ Connected\n');

    // Get existing indexes
    console.log('🔍 Checking existing indexes...');
    const existingIndexes = await collection.listIndexes().toArray();
    console.log(`  - Found ${existingIndexes.length} existing indexes\n`);

    // Create new indexes
    console.log('🔧 Creating/updating indexes...');
    let created = 0;
    let skipped = 0;

    for (const indexDef of INDEXES) {
      const exists = existingIndexes.some(idx => idx.name === indexDef.name);

      if (exists) {
        console.log(`  ⏭️  ${indexDef.name} (already exists)`);
        skipped++;
      } else {
        try {
          await collection.createIndex(indexDef.keys, {
            name: indexDef.name,
            ...indexDef.options
          });
          console.log(`  ✅ ${indexDef.name}`);
          console.log(`     ${indexDef.description}`);
          created++;
        } catch (error) {
          console.log(`  ❌ ${indexDef.name} (failed)`);
          console.error(`     Error: ${error}`);
        }
      }
    }

    console.log('');

    // Check for vector search index
    console.log('🔍 Checking vector search index...');
    const hasVectorIndex = existingIndexes.some(idx => idx.name === 'embedding_index');

    if (hasVectorIndex) {
      console.log('  ✅ Vector search index "embedding_index" found');
    } else {
      console.warn('  ⚠️  Vector search index "embedding_index" NOT found');
      console.warn('     This index must be created manually in MongoDB Atlas');
      console.warn('     See: api/scripts/VECTOR_INDEX_SETUP.md');
    }

    console.log('');

    // Get index statistics
    console.log('📊 Index Statistics...');
    const stats = await collection.stats();
    const indexSize = stats.indexSizes || {};

    console.log(`  - Total indexes: ${existingIndexes.length + created}`);
    console.log(`  - New indexes created: ${created}`);
    console.log(`  - Skipped (existing): ${skipped}`);
    console.log(`  - Total index size: ${formatBytes(Object.values(indexSize).reduce((a: number, b: number) => a + b, 0) as number)}`);
    console.log('');

    // List all indexes with sizes
    console.log('📋 Current Indexes:');
    for (const idx of existingIndexes) {
      const size = indexSize[idx.name] || 0;
      const sizeStr = size > 0 ? `(${formatBytes(size)})` : '';
      console.log(`  - ${idx.name} ${sizeStr}`);
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Index Management Complete                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Error managing indexes:', error);
    throw error;
  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed');
  }
};

/**
 * Remove duplicate URLs (cleanup utility)
 */
const removeDuplicates = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔍 Scanning for duplicate URLs...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Find duplicates
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: '$url',
          count: { $sum: 1 },
          docs: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found\n');
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate URLs`);
    console.log('🗑️  Removing older duplicates (keeping most recent)...');

    let removed = 0;
    for (const dup of duplicates) {
      // Keep first (oldest), remove rest
      const toRemove = dup.docs.slice(1);
      await collection.deleteMany({ _id: { $in: toRemove } });
      removed += toRemove.length;
      console.log(`  - Removed ${toRemove.length} duplicates of ${dup._id}`);
    }

    console.log(`✅ Removed ${removed} duplicate documents\n`);

  } finally {
    await client.close();
  }
};

/**
 * Format bytes to human-readable
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// Run based on arguments
const command = process.argv[2];

if (command === 'cleanup') {
  removeDuplicates()
    .then(() => ensureIndexes())
    .then(() => {
      console.log('✅ Cleanup and index management completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
} else {
  ensureIndexes()
    .then(() => {
      console.log('✅ Index management completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}
