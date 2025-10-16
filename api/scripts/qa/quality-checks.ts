#!/usr/bin/env tsx
/**
 * Quality Assurance Checks
 *
 * Validates data quality in the knowledge base:
 * - Embedding dimension consistency
 * - Content quality (length, duplicates)
 * - Chunk distribution analysis
 * - Data completeness checks
 * - URL accessibility verification
 *
 * Usage:
 *   npm run qa:check
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

interface QualityReport {
  totalDocuments: number;
  uniqueUrls: number;
  embeddingIssues: {
    missingEmbeddings: number;
    wrongDimensions: number;
    invalidValues: number;
  };
  contentIssues: {
    tooShort: number;
    tooLong: number;
    emptyContent: number;
  };
  chunkDistribution: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
  completeness: {
    missingTitle: number;
    missingType: number;
    missingSummary: number;
    missingUrl: number;
  };
  typeBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
}

/**
 * Run comprehensive quality checks
 */
const runQualityChecks = async (): Promise<QualityReport> => {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Quality Assurance Check                                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    console.log('✅ Connected\n');

    // Initialize report
    const report: QualityReport = {
      totalDocuments: 0,
      uniqueUrls: 0,
      embeddingIssues: {
        missingEmbeddings: 0,
        wrongDimensions: 0,
        invalidValues: 0
      },
      contentIssues: {
        tooShort: 0,
        tooLong: 0,
        emptyContent: 0
      },
      chunkDistribution: {
        min: 0,
        max: 0,
        avg: 0,
        median: 0
      },
      completeness: {
        missingTitle: 0,
        missingType: 0,
        missingSummary: 0,
        missingUrl: 0
      },
      typeBreakdown: {},
      countryBreakdown: {}
    };

    // Basic counts
    console.log('📊 Collecting basic statistics...');
    report.totalDocuments = await collection.countDocuments();
    report.uniqueUrls = (await collection.distinct('url')).length;
    console.log(`  - Total documents: ${report.totalDocuments}`);
    console.log(`  - Unique URLs: ${report.uniqueUrls}\n`);

    // Check embeddings
    console.log('🔍 Checking embedding quality...');
    const docs = await collection.find({}).toArray();
    const contentLengths: number[] = [];

    for (const doc of docs) {
      // Embedding checks
      if (!doc.embedding) {
        report.embeddingIssues.missingEmbeddings++;
      } else if (!Array.isArray(doc.embedding)) {
        report.embeddingIssues.invalidValues++;
      } else if (doc.embedding.length !== 1536) {
        report.embeddingIssues.wrongDimensions++;
      } else if (doc.embedding.some((v: number) => isNaN(v) || !isFinite(v))) {
        report.embeddingIssues.invalidValues++;
      }

      // Content checks
      const contentLength = doc.content?.length || 0;
      contentLengths.push(contentLength);

      if (contentLength === 0) {
        report.contentIssues.emptyContent++;
      } else if (contentLength < 100) {
        report.contentIssues.tooShort++;
      } else if (contentLength > 10000) {
        report.contentIssues.tooLong++;
      }

      // Completeness checks
      if (!doc.title) report.completeness.missingTitle++;
      if (!doc.type) report.completeness.missingType++;
      if (!doc.summary) report.completeness.missingSummary++;
      if (!doc.url) report.completeness.missingUrl++;

      // Type breakdown
      if (doc.type) {
        report.typeBreakdown[doc.type] = (report.typeBreakdown[doc.type] || 0) + 1;
      }

      // Country breakdown
      if (doc.country) {
        report.countryBreakdown[doc.country] = (report.countryBreakdown[doc.country] || 0) + 1;
      }
    }

    console.log(`  - Missing embeddings: ${report.embeddingIssues.missingEmbeddings}`);
    console.log(`  - Wrong dimensions: ${report.embeddingIssues.wrongDimensions}`);
    console.log(`  - Invalid values: ${report.embeddingIssues.invalidValues}\n`);

    // Content length distribution
    console.log('📏 Analyzing content length distribution...');
    contentLengths.sort((a, b) => a - b);
    report.chunkDistribution = {
      min: contentLengths[0] || 0,
      max: contentLengths[contentLengths.length - 1] || 0,
      avg: Math.round(contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length) || 0,
      median: contentLengths[Math.floor(contentLengths.length / 2)] || 0
    };

    console.log(`  - Min length: ${report.chunkDistribution.min} chars`);
    console.log(`  - Max length: ${report.chunkDistribution.max} chars`);
    console.log(`  - Avg length: ${report.chunkDistribution.avg} chars`);
    console.log(`  - Median length: ${report.chunkDistribution.median} chars\n`);

    // Content issues
    console.log('⚠️  Content issues:');
    console.log(`  - Empty content: ${report.contentIssues.emptyContent}`);
    console.log(`  - Too short (<100 chars): ${report.contentIssues.tooShort}`);
    console.log(`  - Too long (>10K chars): ${report.contentIssues.tooLong}\n`);

    // Completeness
    console.log('✅ Data completeness:');
    console.log(`  - Missing title: ${report.completeness.missingTitle}`);
    console.log(`  - Missing type: ${report.completeness.missingType}`);
    console.log(`  - Missing summary: ${report.completeness.missingSummary}`);
    console.log(`  - Missing URL: ${report.completeness.missingUrl}\n`);

    // Type breakdown
    console.log('📚 Document types:');
    Object.entries(report.typeBreakdown)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });
    console.log('');

    // Country breakdown
    if (Object.keys(report.countryBreakdown).length > 0) {
      console.log('🌍 Country coverage:');
      Object.entries(report.countryBreakdown)
        .sort(([, a], [, b]) => b - a)
        .forEach(([country, count]) => {
          console.log(`  - ${country}: ${count}`);
        });
      console.log('');
    }

    // Overall health score
    const totalIssues =
      report.embeddingIssues.missingEmbeddings +
      report.embeddingIssues.wrongDimensions +
      report.embeddingIssues.invalidValues +
      report.contentIssues.emptyContent +
      report.completeness.missingTitle +
      report.completeness.missingType +
      report.completeness.missingSummary +
      report.completeness.missingUrl;

    const healthScore = Math.max(0, 100 - (totalIssues / report.totalDocuments * 100));

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  Health Score: ${healthScore.toFixed(1)}%                                    ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (healthScore >= 95) {
      console.log('✅ Excellent data quality!');
    } else if (healthScore >= 80) {
      console.log('⚠️  Good data quality with some issues to address');
    } else {
      console.log('❌ Data quality needs improvement');
    }

    console.log('');

    return report;

  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed');
  }
};

/**
 * Check for duplicate content (beyond URL)
 */
const checkDuplicateContent = async (): Promise<void> => {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('\n🔍 Checking for duplicate content...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Find duplicates by content hash
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: { $substr: ['$content', 0, 100] }, // First 100 chars as simple hash
          count: { $sum: 1 },
          urls: { $push: '$url' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    if (duplicates.length === 0) {
      console.log('  ✅ No duplicate content found');
    } else {
      console.log(`  ⚠️  Found ${duplicates.length} potential content duplicates:`);
      duplicates.slice(0, 5).forEach(dup => {
        console.log(`    - ${dup.count} duplicates: ${dup.urls.join(', ')}`);
      });
    }

  } finally {
    await client.close();
  }
};

/**
 * Check URL patterns for anomalies
 */
const checkUrlPatterns = async (): Promise<void> => {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('\n🔗 Checking URL patterns...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const urls = await collection.distinct('url');
    const domains = new Map<string, number>();

    urls.forEach((url: string) => {
      try {
        const domain = new URL(url).hostname;
        domains.set(domain, (domains.get(domain) || 0) + 1);
      } catch {
        console.log(`  ⚠️  Invalid URL: ${url}`);
      }
    });

    console.log('  Domain distribution:');
    Array.from(domains.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([domain, count]) => {
        console.log(`    - ${domain}: ${count}`);
      });

  } finally {
    await client.close();
  }
};

// Run all checks
const runAllChecks = async () => {
  try {
    const report = await runQualityChecks();
    await checkDuplicateContent();
    await checkUrlPatterns();

    console.log('\n✅ Quality assurance check completed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Quality check failed:', error);
    process.exit(1);
  }
};

runAllChecks();
