/**
 * Parallel Web Crawler with Concurrency Control
 *
 * Efficiently crawls multiple URLs in parallel with:
 * - Configurable concurrency limits
 * - Retry logic with exponential backoff
 * - Progress tracking
 * - Duplicate detection
 */

import axios from 'axios';
import { CrawledDocument, extractTextFromHtml, extractTitle } from './crawler.js';

export interface CrawlResource {
  url: string;
  title: string;
  type: 'Manual' | 'Template' | 'Assurance Report' | 'Guide' | 'Impact Story' | 'Resource';
  summary: string;
  country?: string;
  year?: number;
}

export interface ParallelCrawlOptions {
  concurrency?: number; // Max parallel requests (default: 5)
  retries?: number; // Max retry attempts (default: 3)
  timeout?: number; // Request timeout in ms (default: 30000)
  delayMs?: number; // Delay between batches in ms (default: 1000)
  onProgress?: (completed: number, total: number, current: string) => void;
  checkDuplicates?: (url: string) => Promise<boolean>; // Returns true if URL already exists
}

interface CrawlResult {
  success: boolean;
  document?: CrawledDocument;
  error?: string;
  url: string;
}

/**
 * Sleep utility
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Crawl a single page with retry logic
 */
const crawlWithRetry = async (
  resource: CrawlResource,
  options: Required<Omit<ParallelCrawlOptions, 'onProgress' | 'checkDuplicates'>>
): Promise<CrawlResult> => {
  const { retries, timeout } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(resource.url, {
        timeout,
        headers: {
          'User-Agent': 'CoST-Knowledge-Hub-Crawler/2.0 (Infrastructure Transparency Data Collection)'
        }
      });

      const html = response.data;
      const content = extractTextFromHtml(html);

      // Skip if content too short
      if (content.length < 200) {
        return {
          success: false,
          error: 'Content too short (likely error page)',
          url: resource.url
        };
      }

      const title = resource.title || extractTitle(html);

      return {
        success: true,
        document: {
          title,
          type: resource.type,
          summary: resource.summary,
          content,
          url: resource.url,
          country: resource.country,
          year: resource.year,
          metadata: {
            source: new URL(resource.url).hostname,
            crawledAt: new Date()
          }
        },
        url: resource.url
      };
    } catch (error) {
      const errorMsg = axios.isAxiosError(error) ? error.message : String(error);

      if (attempt === retries) {
        return {
          success: false,
          error: errorMsg,
          url: resource.url
        };
      }

      // Exponential backoff
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      await sleep(backoffMs);
    }
  }

  return {
    success: false,
    error: 'Max retries exceeded',
    url: resource.url
  };
};

/**
 * Process resources in parallel batches
 */
export const crawlAllResourcesParallel = async (
  resources: CrawlResource[],
  options: ParallelCrawlOptions = {}
): Promise<CrawledDocument[]> => {
  const {
    concurrency = 5,
    retries = 3,
    timeout = 30000,
    delayMs = 1000,
    onProgress,
    checkDuplicates
  } = options;

  const documents: CrawledDocument[] = [];
  const errors: string[] = [];
  let completed = 0;

  console.log(`\n🚀 Starting parallel crawl:`);
  console.log(`  - Total resources: ${resources.length}`);
  console.log(`  - Concurrency: ${concurrency}`);
  console.log(`  - Max retries: ${retries}`);
  console.log(`  - Timeout: ${timeout}ms\n`);

  // Filter out duplicates if check function provided
  let resourcesToProcess = resources;
  if (checkDuplicates) {
    console.log('🔍 Checking for existing URLs...');
    const existingChecks = await Promise.all(
      resources.map(async r => ({
        resource: r,
        exists: await checkDuplicates(r.url)
      }))
    );

    const skipped = existingChecks.filter(c => c.exists);
    resourcesToProcess = existingChecks
      .filter(c => !c.exists)
      .map(c => c.resource);

    console.log(`  - Already indexed: ${skipped.length}`);
    console.log(`  - To process: ${resourcesToProcess.length}\n`);

    if (resourcesToProcess.length === 0) {
      console.log('✅ All resources already indexed');
      return [];
    }
  }

  // Process in batches
  for (let i = 0; i < resourcesToProcess.length; i += concurrency) {
    const batch = resourcesToProcess.slice(i, i + concurrency);
    const batchNumber = Math.floor(i / concurrency) + 1;
    const totalBatches = Math.ceil(resourcesToProcess.length / concurrency);

    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} URLs)...`);

    const results = await Promise.all(
      batch.map(resource =>
        crawlWithRetry(resource, {
          retries,
          timeout,
          concurrency,
          delayMs: 0 // No delay within batch
        })
      )
    );

    // Process results
    results.forEach(result => {
      completed++;

      if (result.success && result.document) {
        documents.push(result.document);
        console.log(`  ✅ ${result.url}`);
      } else {
        errors.push(`${result.url}: ${result.error}`);
        console.log(`  ❌ ${result.url} (${result.error})`);
      }

      if (onProgress) {
        onProgress(completed, resourcesToProcess.length, result.url);
      }
    });

    // Delay between batches
    if (i + concurrency < resourcesToProcess.length && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.log(`\n✅ Parallel crawl complete:`);
  console.log(`  - Successful: ${documents.length}`);
  console.log(`  - Failed: ${errors.length}`);
  console.log(`  - Total processed: ${completed}\n`);

  if (errors.length > 0) {
    console.log('⚠️  Errors:');
    errors.forEach(err => console.log(`  - ${err}`));
    console.log('');
  }

  return documents;
};

/**
 * Estimate crawl time
 */
export const estimateCrawlTime = (
  resourceCount: number,
  concurrency: number,
  avgTimePerRequest: number = 3000
): number => {
  const batches = Math.ceil(resourceCount / concurrency);
  return batches * avgTimePerRequest;
};
