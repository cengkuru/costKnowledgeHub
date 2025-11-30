import { Db } from 'mongodb';
import { COLLECTION_NAME } from '../models/Resource';
import { CATEGORIES_COLLECTION_NAME } from '../models/Category';

/**
 * Creates all necessary database indexes for optimal query performance
 * Should be run during application startup or deployment
 */
export async function createDatabaseIndexes(db: Db): Promise<void> {
  console.log('Creating database indexes...');

  try {
    // Resource Collection Indexes
    const resourcesCollection = db.collection(COLLECTION_NAME);

    // Single field indexes for filtering
    await resourcesCollection.createIndex({ status: 1 });
    await resourcesCollection.createIndex({ category: 1 });
    await resourcesCollection.createIndex({ resourceType: 1 });

    // Multikey indexes for legacy array fields
    await resourcesCollection.createIndex({ tags: 1 });
    await resourcesCollection.createIndex({ topics: 1 });
    await resourcesCollection.createIndex({ regions: 1 });

    // Multikey indexes for CoST taxonomy fields
    await resourcesCollection.createIndex({ countryPrograms: 1 });
    await resourcesCollection.createIndex({ themes: 1 });
    await resourcesCollection.createIndex({ oc4idsAlignment: 1 });
    await resourcesCollection.createIndex({ workstreams: 1 });
    await resourcesCollection.createIndex({ audience: 1 });

    // Compound index for common query pattern: status + category + sort by date
    await resourcesCollection.createIndex(
      { status: 1, category: 1, createdAt: -1 },
      { name: 'status_category_created' }
    );

    // Compound index for published content by type
    await resourcesCollection.createIndex(
      { status: 1, resourceType: 1, publishedAt: -1 },
      { name: 'status_type_published' }
    );

    // Text search index for full-text search
    await resourcesCollection.createIndex(
      { title: 'text', description: 'text', tags: 'text' },
      {
        name: 'text_search',
        weights: {
          title: 10,
          description: 5,
          tags: 3
        }
      }
    );

    // Index for engagement tracking
    await resourcesCollection.createIndex({ clicks: -1 });
    await resourcesCollection.createIndex({ lastClickedAt: -1 });

    // Index for lifecycle queries
    await resourcesCollection.createIndex({ publishedAt: -1 });
    await resourcesCollection.createIndex({ archivedAt: -1 });
    await resourcesCollection.createIndex({ updatedAt: -1 });

    // Index for user tracking
    await resourcesCollection.createIndex({ createdBy: 1 });
    await resourcesCollection.createIndex({ updatedBy: 1 });

    // Index for superseded resources
    await resourcesCollection.createIndex({ supersededBy: 1 }, { sparse: true });

    // Unique index for URL (prevent duplicates)
    await resourcesCollection.createIndex(
      { url: 1 },
      { unique: true, name: 'unique_url' }
    );

    // Unique index for slug (prevent duplicates)
    await resourcesCollection.createIndex(
      { slug: 1 },
      { unique: true, name: 'unique_slug' }
    );

    // Indexes for new CoST-specific fields
    await resourcesCollection.createIndex({ accessLevel: 1 });
    await resourcesCollection.createIndex({ language: 1 });
    await resourcesCollection.createIndex({ isTranslation: 1 });
    await resourcesCollection.createIndex({ canonicalId: 1 }, { sparse: true });
    await resourcesCollection.createIndex({ publicationDate: -1 });
    await resourcesCollection.createIndex({ lastVerified: -1 });
    await resourcesCollection.createIndex({ validUntil: 1 }, { sparse: true });
    await resourcesCollection.createIndex({ aiCitations: -1 });

    // Compound index for filtering by country and theme
    await resourcesCollection.createIndex(
      { countryPrograms: 1, themes: 1 },
      { name: 'country_themes' }
    );

    // Compound index for published resources by language
    await resourcesCollection.createIndex(
      { status: 1, language: 1, publicationDate: -1 },
      { name: 'status_language_published' }
    );

    console.log('✅ Resource indexes created successfully');

    // Category Collection Indexes
    const categoriesCollection = db.collection(CATEGORIES_COLLECTION_NAME);

    // Unique index for slug (prevent duplicate slugs)
    await categoriesCollection.createIndex(
      { slug: 1 },
      { unique: true, name: 'unique_slug' }
    );

    // Index for hierarchical queries
    await categoriesCollection.createIndex({ parentCategory: 1 }, { sparse: true });

    // Index for ordered retrieval
    await categoriesCollection.createIndex({ order: 1 });

    // Compound index for hierarchical ordering
    await categoriesCollection.createIndex(
      { parentCategory: 1, order: 1 },
      { name: 'parent_order' }
    );

    console.log('✅ Category indexes created successfully');
    console.log('All database indexes created successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
    throw error;
  }
}

/**
 * Lists all indexes for the resources collection
 * Useful for debugging and verification
 */
export async function listResourceIndexes(db: Db): Promise<any[]> {
  const collection = db.collection(COLLECTION_NAME);
  const indexes = await collection.indexes();
  return indexes;
}

/**
 * Lists all indexes for the categories collection
 * Useful for debugging and verification
 */
export async function listCategoryIndexes(db: Db): Promise<any[]> {
  const collection = db.collection(CATEGORIES_COLLECTION_NAME);
  const indexes = await collection.indexes();
  return indexes;
}

/**
 * Drops all indexes except _id (use with caution!)
 * Useful for development/testing
 */
export async function dropAllIndexes(db: Db): Promise<void> {
  try {
    await db.collection(COLLECTION_NAME).dropIndexes();
    await db.collection(CATEGORIES_COLLECTION_NAME).dropIndexes();
    console.log('All indexes dropped successfully');
  } catch (error) {
    console.error('Error dropping indexes:', error);
    throw error;
  }
}
