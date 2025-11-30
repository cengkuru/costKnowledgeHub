/**
 * Fix script to add missing isActive field to seeded data
 * Run with: npx ts-node src/scripts/fixSeedData.ts
 */

import 'dotenv/config';
import { connectToDatabase, closeDatabase } from '../db';

async function fixSeedData() {
  console.log('🔧 Fixing Seed Data\n');

  try {
    const db = await connectToDatabase();

    // Update all topics to have isActive: true
    const topicResult = await db.collection('topics').updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );
    console.log(`Topics updated: ${topicResult.modifiedCount}`);

    // Update all resource types to have isActive: true
    const typeResult = await db.collection('resourceTypes').updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );
    console.log(`Resource Types updated: ${typeResult.modifiedCount}`);

    // Verify
    const activeTopics = await db.collection('topics').countDocuments({ isActive: true });
    const activeTypes = await db.collection('resourceTypes').countDocuments({ isActive: true });

    console.log(`\nActive Topics: ${activeTopics}`);
    console.log(`Active Resource Types: ${activeTypes}`);

    console.log('\n✅ Fix complete!');

    await closeDatabase();
  } catch (error) {
    console.error('❌ Fix failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

fixSeedData();
