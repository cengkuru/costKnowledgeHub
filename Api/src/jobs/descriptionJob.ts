/**
 * Weekly Description Job
 *
 * Runs every Sunday at 2 AM to fill missing descriptions
 * using AI-powered generation (Claude Haiku)
 */

import cron from 'node-cron';
import { getDatabase } from '../db';
import { aiService } from '../services/aiService';
import { Resource, COLLECTION_NAME } from '../models/Resource';

const SYSTEM_USER_ID = '000000000000000000000001';

/**
 * Find resources that need descriptions
 * - Empty or very short descriptions (< 20 chars)
 * - Not locked (descriptionLocked: false or undefined)
 */
async function findResourcesNeedingDescriptions(): Promise<Resource[]> {
  const db = await getDatabase();
  const collection = db.collection<Resource>(COLLECTION_NAME);

  return await collection.find({
    $and: [
      {
        $or: [
          { description: { $exists: false } },
          { description: '' },
          { description: { $regex: /^.{0,20}$/ } }
        ]
      },
      {
        $or: [
          { descriptionLocked: false },
          { descriptionLocked: { $exists: false } }
        ]
      }
    ]
  }).toArray();
}

/**
 * Generate and update description for a single resource
 */
async function updateResourceDescription(resource: Resource): Promise<boolean> {
  const db = await getDatabase();
  const collection = db.collection<Resource>(COLLECTION_NAME);

  try {
    const description = await aiService.generateDescription(
      resource.url,
      resource.title
    );

    if (!description || description.length < 20) {
      console.log(`[DescriptionJob] Skipped ${resource.title}: AI returned short/empty description`);
      return false;
    }

    await collection.updateOne(
      { _id: resource._id },
      {
        $set: {
          description,
          descriptionSource: 'ai',
          updatedAt: new Date()
        }
      }
    );

    console.log(`[DescriptionJob] Updated: ${resource.title}`);
    return true;
  } catch (error: any) {
    console.error(`[DescriptionJob] Failed for ${resource.title}:`, error.message);
    return false;
  }
}

/**
 * Main job function - fills missing descriptions
 */
export async function fillMissingDescriptions(): Promise<{
  processed: number;
  failed: number;
  skipped: number;
}> {
  console.log('[DescriptionJob] Starting weekly description fill...');

  const resources = await findResourcesNeedingDescriptions();

  if (resources.length === 0) {
    console.log('[DescriptionJob] No resources need descriptions');
    return { processed: 0, failed: 0, skipped: 0 };
  }

  console.log(`[DescriptionJob] Found ${resources.length} resources needing descriptions`);

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const resource of resources) {
    // Add delay between requests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = await updateResourceDescription(resource);
    if (success) {
      processed++;
    } else {
      failed++;
    }
  }

  console.log(`[DescriptionJob] Complete: ${processed} processed, ${failed} failed, ${skipped} skipped`);

  return { processed, failed, skipped };
}

/**
 * Start the cron job scheduler
 *
 * Schedule: 0 2 * * 0 = Every Sunday at 2:00 AM
 *
 * Cron expression breakdown:
 * - 0: Minute (0)
 * - 2: Hour (2 AM)
 * - *: Day of month (any)
 * - *: Month (any)
 * - 0: Day of week (Sunday = 0)
 */
export function startDescriptionJob(): void {
  console.log('[DescriptionJob] Scheduler initialized - runs every Sunday at 2:00 AM');

  cron.schedule('0 2 * * 0', async () => {
    console.log('[DescriptionJob] Cron triggered at', new Date().toISOString());
    try {
      const result = await fillMissingDescriptions();
      console.log('[DescriptionJob] Job completed:', result);
    } catch (error) {
      console.error('[DescriptionJob] Job failed:', error);
    }
  }, {
    timezone: 'UTC'
  });
}

/**
 * Run the job immediately (for manual triggering)
 */
export async function runDescriptionJobNow(): Promise<{
  processed: number;
  failed: number;
  skipped: number;
}> {
  console.log('[DescriptionJob] Manual run triggered');
  return await fillMissingDescriptions();
}
