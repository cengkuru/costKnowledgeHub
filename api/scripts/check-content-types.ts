#!/usr/bin/env tsx
/**
 * Check content types and publication dates in database
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = 'infrascope';
const COLLECTION_NAME = 'docs';

const checkContentTypes = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const docs = db.collection(COLLECTION_NAME);

    // Get content type breakdown
    const typeBreakdown = await docs.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('\n📊 Content Type Breakdown:');
    console.log('════════════════════════════');
    typeBreakdown.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count}`);
    });

    // Check publication dates
    const withDates = await docs.countDocuments({ publishedDate: { $exists: true } });
    const total = await docs.countDocuments();

    console.log('\n📅 Publication Date Statistics:');
    console.log('════════════════════════════');
    console.log(`  With publishedDate: ${withDates}`);
    console.log(`  Without publishedDate: ${total - withDates}`);
    console.log(`  Total documents: ${total}`);

    // Sample documents with publication dates
    const samplesWithDates = await docs
      .find({ publishedDate: { $exists: true } })
      .limit(5)
      .project({ title: 1, type: 1, publishedDate: 1, url: 1 })
      .toArray();

    if (samplesWithDates.length > 0) {
      console.log('\n📰 Sample Documents with Publication Dates:');
      console.log('════════════════════════════');
      samplesWithDates.forEach(doc => {
        console.log(`  - ${doc.title}`);
        console.log(`    Type: ${doc.type}`);
        console.log(`    Published: ${doc.publishedDate}`);
        console.log(`    URL: ${doc.url}\n`);
      });
    }

    // Check year field distribution
    const yearBreakdown = await docs.aggregate([
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]).toArray();

    console.log('📅 Year Field Distribution:');
    console.log('════════════════════════════');
    yearBreakdown.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count}`);
    });

  } finally {
    await client.close();
  }
};

checkContentTypes().catch(console.error);
