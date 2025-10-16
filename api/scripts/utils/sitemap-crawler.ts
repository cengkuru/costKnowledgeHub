/**
 * Sitemap and Link Discovery Crawler
 *
 * Discovers all pages on a website by:
 * 1. Checking for sitemap.xml
 * 2. Crawling main navigation links
 * 3. Following internal links up to specified depth
 */

import axios from 'axios';
import { CrawlResource } from './crawler-parallel.js';

interface CrawlOptions {
  baseUrl: string;
  maxDepth?: number;
  maxPages?: number;
  excludePatterns?: RegExp[];
  includePatterns?: RegExp[];
  useSitemap?: boolean;
  sitemapUrls?: string[];
}

/**
 * Normalize a URL to ensure consistent formatting and domain matching
 */
const normalizeUrl = (rawUrl: string, baseUrl: string): string | null => {
  try {
    const base = new URL(baseUrl);
    const candidate = new URL(rawUrl, base);

    const normalizeHost = (host: string) => host.replace(/^www\./i, '');
    if (normalizeHost(candidate.hostname) !== normalizeHost(base.hostname)) {
      return null;
    }

    const protocol = base.protocol;
    const host = base.host;

    let pathname = candidate.pathname.replace(/\/+/g, '/');
    if (pathname !== '/' && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    if (pathname === '/') {
      pathname = '';
    }

    return `${protocol}//${host}${pathname}`;
  } catch {
    return null;
  }
};

/**
 * Extract all links from HTML
 */
const extractLinks = (html: string, baseUrl: string): string[] => {
  const links = new Set<string>();
  const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];

    // Skip anchors, mailto, tel, javascript
    if (
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    ) {
      continue;
    }

    const normalized = normalizeUrl(href, baseUrl);
    if (normalized) {
      links.add(normalized);
    }
  }

  return Array.from(links);
};

/**
 * Extract page title from HTML
 */
const extractPageTitle = (html: string, url: string): string => {
  // Try <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim().replace(' - CoST', '').replace(' | CoST', '').trim();
  }

  // Try <h1> tag
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].replace(/<[^>]+>/g, '').trim();
  }

  // Fallback to URL path
  const path = new URL(url).pathname.split('/').filter(p => p).pop() || 'Home';
  return path.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

/**
 * Determine document type based on URL and content
 */
const determineType = (url: string, html: string): CrawlResource['type'] => {
  const urlLower = url.toLowerCase();
  const htmlLower = html.toLowerCase();

  if (urlLower.includes('/resource') || urlLower.includes('/publication') || urlLower.includes('/download')) {
    return 'Resource';
  }
  if (urlLower.includes('/guide') || urlLower.includes('/how-to')) {
    return 'Guide';
  }
  if (urlLower.includes('/manual') || urlLower.includes('/handbook')) {
    return 'Manual';
  }
  if (urlLower.includes('/template')) {
    return 'Template';
  }
  if (urlLower.includes('/report') && htmlLower.includes('assurance')) {
    return 'Assurance Report';
  }
  if (urlLower.includes('/impact') || urlLower.includes('/case-stud') || urlLower.includes('/story')) {
    return 'Impact Story';
  }

  // Default based on content
  if (htmlLower.includes('guide') || htmlLower.includes('how to')) {
    return 'Guide';
  }

  return 'Resource';
};

/**
 * Generate summary from HTML content
 */
const generateSummary = (html: string, title: string): string => {
  // Try meta description
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (metaMatch) {
    return metaMatch[1].trim();
  }

  // Try first paragraph
  const pMatch = html.match(/<p[^>]*>([^<]+)<\/p>/i);
  if (pMatch) {
    const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 50) {
      return text.slice(0, 200) + '...';
    }
  }

  // Fallback
  return `Information about ${title} from CoST Infrastructure Transparency Initiative.`;
};

/**
 * Attempt to collect links from available sitemap endpoints
 */
const discoverFromSitemaps = async (
  baseUrl: string,
  maxPages: number,
  excludePatterns: RegExp[],
  explicitSitemaps?: string[]
): Promise<string[]> => {
  const discovered = new Set<string>();
  const visitedSitemaps = new Set<string>();

  const base = normalizeUrl(baseUrl, baseUrl);
  if (!base) {
    return [];
  }

  const candidateSitemaps =
    explicitSitemaps && explicitSitemaps.length > 0
      ? explicitSitemaps
      : [
          `${base}/wp-sitemap.xml`,
          `${base}/sitemap_index.xml`,
          `${base}/sitemap.xml`
        ];

  const fetchSitemap = async (sitemapUrl: string): Promise<void> => {
    if (visitedSitemaps.has(sitemapUrl) || discovered.size >= maxPages) {
      return;
    }

    visitedSitemaps.add(sitemapUrl);

    try {
      const response = await axios.get(sitemapUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'CoST-Knowledge-Hub-Crawler/2.0 (Infrastructure Transparency Data Collection)'
        }
      });

      const xml = response.data as string;
      const isIndex = /<\s*sitemapindex/i.test(xml);
      const locMatches = Array.from(xml.matchAll(/<loc[^>]*>([^<]+)<\/loc>/gi));

      for (const match of locMatches) {
        const locRaw = match[1].trim();
        const normalized = normalizeUrl(locRaw, base);

        if (!normalized) continue;
        if (excludePatterns.some(pattern => pattern.test(normalized))) continue;

        if (isIndex) {
          await fetchSitemap(normalized);
        } else {
          discovered.add(normalized);
          if (discovered.size >= maxPages) break;
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log(`  ⚠️  Skipped sitemap ${sitemapUrl}: ${error.message}`);
      } else {
        console.log(`  ⚠️  Skipped sitemap ${sitemapUrl}`);
      }
    }
  };

  for (const sitemap of candidateSitemaps) {
    if (discovered.size >= maxPages) break;
    await fetchSitemap(sitemap);
  }

  return Array.from(discovered);
};

/**
 * Crawl website and discover all pages
 */
export const discoverPages = async (options: CrawlOptions): Promise<CrawlResource[]> => {
  const {
    baseUrl,
    maxDepth = 2,
    maxPages = 100,
    excludePatterns = [
      /\/wp-admin\//,
      /\/wp-content\//,
      /\/wp-includes\//,
      /\.(jpg|jpeg|png|gif|pdf|zip|doc|docx|xls|xlsx)$/i,
      /\/feed\//,
      /\/cart\//,
      /\/checkout\//,
      /\?/  // Skip query parameters for now
    ],
    includePatterns = [],
    useSitemap = true,
    sitemapUrls
  } = options;

  const normalizedBaseUrl = normalizeUrl(baseUrl, baseUrl);
  if (!normalizedBaseUrl) {
    throw new Error(`Invalid base URL: ${baseUrl}`);
  }

  const discovered = new Map<string, CrawlResource>();
  const visited = new Set<string>();
  const queued = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [];

  const isExcluded = (url: string) => excludePatterns.some(pattern => pattern.test(url));
  const matchesInclude = (url: string) =>
    includePatterns.length === 0 || includePatterns.some(pattern => pattern.test(url));

  const enqueue = (candidate: string, depth: number) => {
    if (!candidate) return;
    if (depth > maxDepth) return;
    if (queued.has(candidate) || visited.has(candidate)) return;
    if (isExcluded(candidate)) return;
    if (!matchesInclude(candidate)) return;
    if (discovered.size + queue.length >= maxPages && depth > 0) return;

    queue.push({ url: candidate, depth });
    queued.add(candidate);
  };

  enqueue(normalizedBaseUrl, 0);

  console.log(`\n🔍 Discovering pages on ${baseUrl}...`);
  console.log(`  - Max depth: ${maxDepth}`);
  console.log(`  - Max pages: ${maxPages}\n`);

  if (useSitemap) {
    console.log('🗺️  Attempting sitemap discovery...');
    const sitemapLinks = await discoverFromSitemaps(
      normalizedBaseUrl,
      maxPages,
      excludePatterns,
      sitemapUrls
    );

    if (sitemapLinks.length > 0) {
      console.log(`  - Found ${sitemapLinks.length} sitemap URLs`);
      sitemapLinks.forEach(link => enqueue(link, 0));
    } else {
      console.log('  - No sitemap URLs discovered (falling back to link crawling)');
    }
    console.log('');
  }

  while (queue.length > 0 && discovered.size < maxPages) {
    const { url, depth } = queue.shift()!;
    queued.delete(url);

    // Skip if already visited
    if (visited.has(url)) continue;
    visited.add(url);

    // Skip if excluded
    if (excludePatterns.some(pattern => pattern.test(url))) {
      continue;
    }

    // Skip if include patterns specified and doesn't match
    if (includePatterns.length > 0 && !includePatterns.some(pattern => pattern.test(url))) {
      continue;
    }

    try {
      console.log(`  ${discovered.size + 1}. Crawling: ${url} (depth: ${depth})`);

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'CoST-Knowledge-Hub-Crawler/2.0 (Infrastructure Transparency Data Collection)'
        }
      });

      const html = response.data;

      // Extract page info
      const title = extractPageTitle(html, url);
      const type = determineType(url, html);
      const summary = generateSummary(html, title);

      // Add to discovered resources
      discovered.set(url, {
        url,
        title,
        type,
        summary,
        year: new Date().getFullYear()
      });

      // Find and queue new links (if not at max depth)
      if (depth < maxDepth) {
        const links = extractLinks(html, baseUrl);
        for (const link of links) {
          enqueue(link, depth + 1);
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log(`     ❌ Failed: ${error.message}`);
      }
    }
  }

  const resources = Array.from(discovered.values());

  console.log(`\n✅ Discovery complete:`);
  console.log(`  - Pages discovered: ${resources.length}`);
  console.log(`  - Pages visited: ${visited.size}\n`);

  // Show type breakdown
  const byType = resources.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Type breakdown:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });
  console.log('');

  return resources;
};

/**
 * Discover and save resources to file
 */
export const discoverAndSave = async (
  baseUrl: string,
  outputFile: string,
  options?: Partial<CrawlOptions>
): Promise<CrawlResource[]> => {
  const resources = await discoverPages({
    baseUrl,
    ...options
  });

  // Save to TypeScript file
  const fileContent = `/**
 * Auto-discovered resources from ${baseUrl}
 * Generated: ${new Date().toISOString()}
 * Total resources: ${resources.length}
 */

import { CrawlResource } from '../utils/crawler-parallel.js';

export const DISCOVERED_RESOURCES: CrawlResource[] = ${JSON.stringify(resources, null, 2)};
`;

  const fs = await import('fs');
  fs.writeFileSync(outputFile, fileContent, 'utf-8');

  console.log(`✅ Saved ${resources.length} resources to ${outputFile}\n`);

  return resources;
};
