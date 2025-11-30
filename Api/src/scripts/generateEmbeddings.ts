/**
 * Generate embeddings for all resources
 * Run with: npx ts-node src/scripts/generateEmbeddings.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { embeddingService, EMBEDDING_DIMENSIONS } from '../services/embeddingService';

dotenv.config();

async function generateEmbeddings() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db(process.env.DB_NAME || 'cost_knowledge_hub');
  const collection = db.collection('resources');

  try {
    // Get all resources without embeddings
    const resources = await collection
      .find({ embedding: { $exists: false } })
      .toArray();

    console.log(`Found ${resources.length} resources without embeddings`);

    let processed = 0;
    let failed = 0;

    for (const resource of resources) {
      try {
        // Create searchable text from resource
        const text = embeddingService.createResourceText({
          title: resource.title || '',
          description: resource.description || '',
          themes: resource.themes || [],
          tags: resource.tags || [],
          countryPrograms: resource.countryPrograms || [],
        });

        if (!text.trim()) {
          console.log(`  ! Skipping ${resource.title}: No text content`);
          continue;
        }

        // Generate embedding
        console.log(`  Generating embedding for: ${resource.title?.substring(0, 50)}...`);
        const embedding = await embeddingService.generateEmbedding(text);

        // Store embedding in document
        await collection.updateOne(
          { _id: resource._id },
          {
            $set: {
              embedding: embedding,
              embeddingModel: 'text-embedding-004',
              embeddingUpdatedAt: new Date(),
            },
          }
        );

        processed++;
        console.log(`  ✓ Done (${processed}/${resources.length})`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        failed++;
        console.error(`  ✗ Failed for ${resource.title}:`, error);
      }
    }

    console.log('\n=== Embedding Generation Complete ===');
    console.log(`Processed: ${processed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total resources: ${await collection.countDocuments()}`);
    console.log(`Resources with embeddings: ${await collection.countDocuments({ embedding: { $exists: true } })}`);

    // Verify embedding dimensions
    const sampleDoc = await collection.findOne({ embedding: { $exists: true } });
    if (sampleDoc?.embedding) {
      console.log(`\nEmbedding dimensions: ${sampleDoc.embedding.length}`);
      console.log(`Expected dimensions: ${EMBEDDING_DIMENSIONS}`);
    }

  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

// Run
generateEmbeddings()
  .then(() => {
    console.log('\nEmbedding generation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Embedding generation failed:', error);
    process.exit(1);
  });
