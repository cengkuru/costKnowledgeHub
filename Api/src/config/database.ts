import { Db } from 'mongodb';
import { getDatabase } from '../db';

// Re-export the db instance for use in services
export let db: Db;

/**
 * Initialize database connection for services
 */
export async function initDatabase(): Promise<void> {
  db = await getDatabase();
}

/**
 * Get database instance (will initialize if not already connected)
 */
export async function getDb(): Promise<Db> {
  if (!db) {
    db = await getDatabase();
  }
  return db;
}
