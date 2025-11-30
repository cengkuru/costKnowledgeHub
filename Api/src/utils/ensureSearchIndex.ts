import { searchService } from '../services/searchService';

/**
 * Ensure search indexes are created for the database
 * This should be called on application startup
 */
export async function ensureSearchIndexes(): Promise<void> {
  try {
    console.log('Creating search indexes...');
    await searchService.ensureTextIndex();
    console.log('✅ Search indexes created successfully');
  } catch (error) {
    console.error('❌ Failed to create search indexes:', error);
    // Don't throw - allow server to start even if index creation fails
    // (index might already exist)
  }
}
