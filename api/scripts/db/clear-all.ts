#!/usr/bin/env tsx
/**
 * Clear all documents from database
 *
 * Usage:
 *   npm run db:clear
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COLLECTION_NAME = 'docs';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

const clearDatabase = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🗑️  Clearing database...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const result = await collection.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} documents\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
};

clearDatabase();
