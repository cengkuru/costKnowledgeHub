/**
 * Cost Tracking and Monitoring System
 *
 * Tracks and reports costs for:
 * - Embedding generation (OpenAI API)
 * - MongoDB storage
 * - Crawling operations
 *
 * Provides cost alerts and budget management
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';
const COST_COLLECTION = 'cost_tracking';

interface CostEntry {
  timestamp: Date;
  operation: 'crawl' | 'embed' | 'storage' | 'update';
  resourceCount: number;
  tokenCount?: number;
  embeddingCount?: number;
  costUSD: number;
  metadata: {
    model?: string;
    batchSize?: number;
    duration?: number;
    success: boolean;
    errorMessage?: string;
  };
}

interface CostSummary {
  totalCostUSD: number;
  operationBreakdown: {
    crawl: number;
    embed: number;
    storage: number;
    update: number;
  };
  period: {
    start: Date;
    end: Date;
  };
  resourcesProcessed: number;
  tokensProcessed: number;
  embeddingsGenerated: number;
}

/**
 * OpenAI pricing (as of 2024)
 */
const PRICING = {
  'text-embedding-3-small': 0.02 / 1_000_000, // $0.02 per 1M tokens
  'text-embedding-3-large': 0.13 / 1_000_000, // $0.13 per 1M tokens
  'text-embedding-ada-002': 0.10 / 1_000_000, // $0.10 per 1M tokens
  'mongodb-storage': 0.25 / (1024 * 1024 * 1024), // $0.25 per GB/month (estimate)
};

/**
 * Log cost entry to database
 */
export const logCost = async (entry: Omit<CostEntry, 'timestamp'>): Promise<void> => {
  if (!MONGODB_URI) return;

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<CostEntry>(COST_COLLECTION);

    await collection.insertOne({
      ...entry,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log cost:', error);
  } finally {
    await client.close();
  }
};

/**
 * Calculate embedding cost
 */
export const calculateEmbeddingCost = (
  tokenCount: number,
  model: string = 'text-embedding-3-large'
): number => {
  const pricePerToken = PRICING[model as keyof typeof PRICING] || PRICING['text-embedding-3-large'];
  return tokenCount * pricePerToken;
};

/**
 * Estimate storage cost
 */
export const estimateStorageCost = (
  documentCount: number,
  avgDocSizeBytes: number = 5000 // Average doc with embedding ~5KB
): number => {
  const totalSizeGB = (documentCount * avgDocSizeBytes) / (1024 * 1024 * 1024);
  return totalSizeGB * PRICING['mongodb-storage'] * 30; // Monthly cost
};

/**
 * Get cost summary for a time period
 */
export const getCostSummary = async (
  startDate: Date,
  endDate: Date = new Date()
): Promise<CostSummary> => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not configured');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<CostEntry>(COST_COLLECTION);

    const costs = await collection
      .find({
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .toArray();

    const summary: CostSummary = {
      totalCostUSD: 0,
      operationBreakdown: {
        crawl: 0,
        embed: 0,
        storage: 0,
        update: 0
      },
      period: {
        start: startDate,
        end: endDate
      },
      resourcesProcessed: 0,
      tokensProcessed: 0,
      embeddingsGenerated: 0
    };

    costs.forEach(cost => {
      summary.totalCostUSD += cost.costUSD;
      summary.operationBreakdown[cost.operation] += cost.costUSD;
      summary.resourcesProcessed += cost.resourceCount;
      if (cost.tokenCount) summary.tokensProcessed += cost.tokenCount;
      if (cost.embeddingCount) summary.embeddingsGenerated += cost.embeddingCount;
    });

    return summary;
  } finally {
    await client.close();
  }
};

/**
 * Get daily cost summary for the last N days
 */
export const getDailyCostSummary = async (days: number = 30): Promise<CostSummary[]> => {
  const summaries: CostSummary[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - i);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);

    const summary = await getCostSummary(startDate, endDate);
    summaries.push(summary);
  }

  return summaries;
};

/**
 * Check if monthly budget is exceeded
 */
export const checkBudgetAlert = async (monthlyBudgetUSD: number): Promise<{
  exceeded: boolean;
  currentSpend: number;
  remaining: number;
  percentUsed: number;
}> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const summary = await getCostSummary(monthStart, now);
  const percentUsed = (summary.totalCostUSD / monthlyBudgetUSD) * 100;

  return {
    exceeded: summary.totalCostUSD > monthlyBudgetUSD,
    currentSpend: summary.totalCostUSD,
    remaining: Math.max(0, monthlyBudgetUSD - summary.totalCostUSD),
    percentUsed
  };
};

/**
 * Print cost report
 */
export const printCostReport = (summary: CostSummary): void => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Cost Report                                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Period: ${summary.period.start.toLocaleDateString()} - ${summary.period.end.toLocaleDateString()}`);
  console.log('');

  console.log('Total Cost:');
  console.log(`  $${summary.totalCostUSD.toFixed(4)}`);
  console.log('');

  console.log('Breakdown by Operation:');
  console.log(`  - Crawling:  $${summary.operationBreakdown.crawl.toFixed(4)}`);
  console.log(`  - Embedding: $${summary.operationBreakdown.embed.toFixed(4)}`);
  console.log(`  - Storage:   $${summary.operationBreakdown.storage.toFixed(4)}`);
  console.log(`  - Updates:   $${summary.operationBreakdown.update.toFixed(4)}`);
  console.log('');

  console.log('Resources Processed:');
  console.log(`  - Resources: ${summary.resourcesProcessed.toLocaleString()}`);
  console.log(`  - Tokens: ${summary.tokensProcessed.toLocaleString()}`);
  console.log(`  - Embeddings: ${summary.embeddingsGenerated.toLocaleString()}`);
  console.log('');
};

/**
 * CLI tool for cost reporting
 */
const runCostReport = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'today': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const summary = await getCostSummary(today);
        printCostReport(summary);
        break;
      }

      case 'week': {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const summary = await getCostSummary(weekAgo);
        printCostReport(summary);
        break;
      }

      case 'month': {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const summary = await getCostSummary(monthStart);
        printCostReport(summary);
        break;
      }

      case 'budget': {
        const budget = parseFloat(args[1] || '10.0');
        const alert = await checkBudgetAlert(budget);

        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║  Budget Alert                                              ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log(`Monthly Budget: $${budget.toFixed(2)}`);
        console.log(`Current Spend:  $${alert.currentSpend.toFixed(4)}`);
        console.log(`Remaining:      $${alert.remaining.toFixed(4)}`);
        console.log(`Used:           ${alert.percentUsed.toFixed(1)}%`);
        console.log('');

        if (alert.exceeded) {
          console.log('⚠️  WARNING: Monthly budget exceeded!');
        } else if (alert.percentUsed > 80) {
          console.log('⚠️  WARNING: Budget at 80%+ capacity');
        } else {
          console.log('✅ Budget healthy');
        }
        console.log('');
        break;
      }

      default:
        console.log('Usage:');
        console.log('  tsx scripts/monitoring/cost-tracker.ts today');
        console.log('  tsx scripts/monitoring/cost-tracker.ts week');
        console.log('  tsx scripts/monitoring/cost-tracker.ts month');
        console.log('  tsx scripts/monitoring/cost-tracker.ts budget <amount>');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error generating cost report:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCostReport();
}
