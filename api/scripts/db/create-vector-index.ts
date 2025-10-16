#!/usr/bin/env tsx
/**
 * Create Vector Search Index
 *
 * Creates the MongoDB Atlas vector search index for semantic search
 *
 * Note: This script provides the configuration. The actual index must be created
 * in MongoDB Atlas UI or via Atlas Admin API as vector search indexes cannot be
 * created via standard MongoDB drivers.
 *
 * Usage:
 *   npm run db:vector-index
 */

import 'dotenv/config';

const VECTOR_INDEX_CONFIG = {
  name: 'embedding_index',
  type: 'vectorSearch',
  fields: [
    {
      type: 'vector',
      path: 'embedding',
      numDimensions: 1536,
      similarity: 'cosine'
    },
    {
      type: 'filter',
      path: 'type'
    },
    {
      type: 'filter',
      path: 'country'
    },
    {
      type: 'filter',
      path: 'year'
    },
    {
      type: 'filter',
      path: 'metadata.source'
    }
  ]
};

const main = async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  MongoDB Atlas Vector Search Index Configuration          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📋 Vector Search Index Configuration:\n');
  console.log(JSON.stringify(VECTOR_INDEX_CONFIG, null, 2));
  console.log('\n');

  console.log('⚠️  MANUAL SETUP REQUIRED:\n');
  console.log('Vector search indexes must be created via MongoDB Atlas UI or Admin API.');
  console.log('Standard MongoDB drivers cannot create vector search indexes.\n');

  console.log('📝 Steps to create the index:\n');
  console.log('1. Go to https://cloud.mongodb.com');
  console.log('2. Navigate to your cluster → Atlas Search');
  console.log('3. Click "Create Search Index"');
  console.log('4. Select "JSON Editor"');
  console.log('5. Choose database: infrascope, collection: docs');
  console.log('6. Paste the configuration above');
  console.log('7. Click "Create Search Index"\n');

  console.log('⏱️  The index will take 1-5 minutes to build.\n');

  console.log('✅ Once created, your vector search will be ready for semantic search!\n');

  console.log('🔗 Documentation: scripts/VECTOR_INDEX_SETUP.md\n');
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
