#!/usr/bin/env tsx
/**
 * Fix HTML Entities in Existing Documents
 *
 * Updates all documents in the database to decode HTML entities in:
 * - title
 * - summary
 * - content
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

/**
 * Decode HTML entities comprehensively
 */
const decodeHtmlEntities = (text: string): string => {
  if (!text) return text;

  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8211;/g, '\u2013')  // en dash
    .replace(/&#8212;/g, '\u2014')  // em dash
    .replace(/&#8216;/g, '\u2018')  // left single quote
    .replace(/&#8217;/g, '\u2019')  // right single quote
    .replace(/&#8220;/g, '\u201C')  // left double quote
    .replace(/&#8221;/g, '\u201D')  // right double quote
    .replace(/&#8230;/g, '\u2026')  // ellipsis
    .replace(/&mdash;/g, '\u2014')  // em dash (named)
    .replace(/&ndash;/g, '\u2013')  // en dash (named)
    .replace(/&rsquo;/g, '\u2019')  // right single quote (named)
    .replace(/&lsquo;/g, '\u2018')  // left single quote (named)
    .replace(/&rdquo;/g, '\u201D')  // right double quote (named)
    .replace(/&ldquo;/g, '\u201C')  // left double quote (named)
    .replace(/&hellip;/g, '\u2026'); // ellipsis (named)
};

const fixHtmlEntities = async () => {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Fix HTML Entities in Database                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Connect
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    console.log('✅ Connected\n');

    // Count total documents
    const totalDocs = await collection.countDocuments();
    console.log(`📊 Total documents: ${totalDocs}\n`);

    // Find documents with HTML entities
    console.log('🔍 Scanning for HTML entities...');
    const docsWithEntities = await collection.find({
      $or: [
        { title: /&#\d+;|&[a-z]+;/i },
        { summary: /&#\d+;|&[a-z]+;/i },
        { content: /&#\d+;|&[a-z]+;/i }
      ]
    }).toArray();

    console.log(`  ✓ Found ${docsWithEntities.length} documents with HTML entities\n`);

    if (docsWithEntities.length === 0) {
      console.log('✅ No documents need fixing!\n');
      return;
    }

    // Show samples
    console.log('📝 Sample issues found:');
    docsWithEntities.slice(0, 5).forEach((doc, i) => {
      console.log(`  ${i + 1}. "${doc.title.substring(0, 60)}..."`);
    });
    console.log('');

    // Fix documents
    console.log('🔧 Fixing documents...');
    let fixed = 0;
    let failed = 0;

    for (const doc of docsWithEntities) {
      try {
        const updates: any = {};

        // Decode title
        if (doc.title && (/&#\d+;|&[a-z]+;/i.test(doc.title))) {
          updates.title = decodeHtmlEntities(doc.title);
        }

        // Decode summary
        if (doc.summary && (/&#\d+;|&[a-z]+;/i.test(doc.summary))) {
          updates.summary = decodeHtmlEntities(doc.summary);
        }

        // Decode content
        if (doc.content && (/&#\d+;|&[a-z]+;/i.test(doc.content))) {
          updates.content = decodeHtmlEntities(doc.content);
        }

        if (Object.keys(updates).length > 0) {
          await collection.updateOne(
            { _id: doc._id },
            { $set: updates }
          );
          fixed++;

          if (fixed % 50 === 0) {
            process.stdout.write(`\r  Progress: ${fixed}/${docsWithEntities.length}`);
          }
        }
      } catch (error) {
        failed++;
        console.error(`\n  ❌ Failed to fix document ${doc._id}:`, error);
      }
    }

    console.log(`\r  Progress: ${fixed}/${docsWithEntities.length}`);
    console.log('');

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ HTML Entity Fix Complete!                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Summary:');
    console.log(`  - Documents scanned: ${totalDocs}`);
    console.log(`  - Documents with entities: ${docsWithEntities.length}`);
    console.log(`  - Successfully fixed: ${fixed}`);
    console.log(`  - Failed: ${failed}`);
    console.log('');

    if (fixed > 0) {
      console.log('🎉 All HTML entities have been decoded!');
      console.log('   Titles like "CoST &#8211; Infrastructure" are now "CoST – Infrastructure"\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed\n');
  }
};

// Run
fixHtmlEntities()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
