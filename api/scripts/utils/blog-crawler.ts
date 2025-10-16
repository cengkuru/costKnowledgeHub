/**
 * Specialized Blog & News Crawler with Date Extraction
 *
 * Crawls blog posts and news articles from CoST website with enhanced metadata:
 * - Publication dates (for "latest news" queries)
 * - Authors
 * - Categories/tags
 * - Content type detection
 *
 * Supports patterns:
 * - /blog/
 * - /news/
 * - /YYYY/MM/DD/ (date-based URLs)
 */

import axios from 'axios';
import { extractTextFromHtml, extractTitle } from './crawler.js';

export interface BlogArticle {
  url: string;
  title: string;
  content: string;
  publishedDate?: Date;
  updatedDate?: Date;
  author?: string;
  tags: string[];
  type: 'Blog Post' | 'News Article' | 'Press Release';
  excerpt?: string;
  metadata: {
    source: string;
    crawledAt: Date;
    wordCount: number;
    readingTimeMinutes: number;
  };
}

/**
 * Extract publication date from HTML content
 * Tries multiple strategies: meta tags, schema.org, URL pattern, article tags
 */
export const extractPublishedDate = (html: string, url: string): Date | undefined => {
  // Strategy 1: Meta tags
  const metaDateMatch = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i);
  if (metaDateMatch) {
    const date = new Date(metaDateMatch[1]);
    if (!isNaN(date.getTime())) return date;
  }

  // Strategy 2: Schema.org JSON-LD
  const schemaMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (schemaMatch) {
    try {
      const schema = JSON.parse(schemaMatch[1]);
      if (schema.datePublished) {
        const date = new Date(schema.datePublished);
        if (!isNaN(date.getTime())) return date;
      }
    } catch {
      // Invalid JSON, continue
    }
  }

  // Strategy 3: URL pattern (e.g., /2025/04/09/article-title/)
  const urlDateMatch = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
  if (urlDateMatch) {
    const [, year, month, day] = urlDateMatch;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) return date;
  }

  // Strategy 4: Common date patterns in HTML
  const patterns = [
    /<time[^>]*datetime=["']([^"']+)["']/i,
    /<span[^>]*class=["'][^"']*date[^"']*["'][^>]*>([^<]+)</i,
    /<div[^>]*class=["'][^"']*published[^"']*["'][^>]*>([^<]+)</i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) return date;
    }
  }

  return undefined;
};

/**
 * Extract author from HTML
 */
export const extractAuthor = (html: string): string | undefined => {
  // Try meta tag
  const metaAuthorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i);
  if (metaAuthorMatch) return metaAuthorMatch[1].trim();

  // Try byline patterns
  const bylinePatterns = [
    /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /<span[^>]*class=["'][^"']*author[^"']*["'][^>]*>([^<]+)</i,
    /<a[^>]*rel=["']author["'][^>]*>([^<]+)</i
  ];

  for (const pattern of bylinePatterns) {
    const match = html.match(pattern);
    if (match) return match[1].trim();
  }

  return undefined;
};

/**
 * Extract tags/categories from HTML
 */
export const extractTags = (html: string): string[] => {
  const tags = new Set<string>();

  // Look for category/tag links
  const tagPatterns = [
    /<a[^>]*rel=["']tag["'][^>]*>([^<]+)</gi,
    /<a[^>]*class=["'][^"']*category[^"']*["'][^>]*>([^<]+)</gi,
    /<span[^>]*class=["'][^"']*tag[^"']*["'][^>]*>([^<]+)</gi
  ];

  for (const pattern of tagPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const tag = match[1].trim();
      if (tag.length > 0 && tag.length < 50) {
        tags.add(tag);
      }
    }
  }

  return Array.from(tags);
};

/**
 * Detect content type from URL and content
 */
export const detectContentType = (url: string, html: string): 'Blog Post' | 'News Article' | 'Press Release' => {
  if (url.includes('/news/') || html.toLowerCase().includes('press release')) {
    if (html.toLowerCase().includes('press release')) {
      return 'Press Release';
    }
    return 'News Article';
  }
  return 'Blog Post';
};

/**
 * Extract excerpt/summary from article
 */
export const extractExcerpt = (html: string, content: string): string => {
  // Try meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (metaDescMatch && metaDescMatch[1].length > 50) {
    return metaDescMatch[1].trim();
  }

  // Try excerpt div
  const excerptMatch = html.match(/<div[^>]*class=["'][^"']*excerpt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (excerptMatch) {
    const excerptText = extractTextFromHtml(excerptMatch[1]);
    if (excerptText.length > 50) {
      return excerptText.slice(0, 300);
    }
  }

  // Fallback: First 300 chars of content
  return content.slice(0, 300).trim();
};

/**
 * Calculate reading time (avg 200 words per minute)
 */
export const calculateReadingTime = (content: string): number => {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
};

/**
 * Crawl a single blog/news article with enhanced metadata
 */
export const crawlBlogArticle = async (url: string): Promise<BlogArticle | null> => {
  try {
    console.log(`📰 Crawling article: ${url}`);

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'CoST-Knowledge-Hub-Crawler/2.0 (Infrastructure Transparency Data Collection)'
      }
    });

    const html = response.data;
    const content = extractTextFromHtml(html);

    // Skip if content too short
    if (content.length < 200) {
      console.warn(`⚠️  Skipped ${url}: content too short`);
      return null;
    }

    const title = extractTitle(html);
    const publishedDate = extractPublishedDate(html, url);
    const author = extractAuthor(html);
    const tags = extractTags(html);
    const type = detectContentType(url, html);
    const excerpt = extractExcerpt(html, content);
    const wordCount = content.split(/\s+/).length;
    const readingTimeMinutes = calculateReadingTime(content);

    return {
      url,
      title,
      content,
      publishedDate,
      author,
      tags,
      type,
      excerpt,
      metadata: {
        source: new URL(url).hostname,
        crawledAt: new Date(),
        wordCount,
        readingTimeMinutes
      }
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`❌ Failed to crawl ${url}: ${error.message}`);
    } else {
      console.error(`❌ Unexpected error crawling ${url}:`, error);
    }
    return null;
  }
};

/**
 * Crawl multiple blog/news articles in parallel
 */
export const crawlBlogArticlesParallel = async (
  urls: string[],
  concurrency: number = 5
): Promise<BlogArticle[]> => {
  const articles: BlogArticle[] = [];

  console.log(`\n🚀 Starting blog/news crawl:`);
  console.log(`  - Total URLs: ${urls.length}`);
  console.log(`  - Concurrency: ${concurrency}\n`);

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchNumber = Math.floor(i / concurrency) + 1;
    const totalBatches = Math.ceil(urls.length / concurrency);

    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} URLs)...`);

    const results = await Promise.all(
      batch.map(url => crawlBlogArticle(url))
    );

    results.forEach(article => {
      if (article) {
        articles.push(article);
        console.log(`  ✅ ${article.title}`);
        if (article.publishedDate) {
          console.log(`     📅 Published: ${article.publishedDate.toISOString().split('T')[0]}`);
        }
      }
    });

    // Rate limiting
    if (i + concurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n✅ Blog/news crawl complete:`);
  console.log(`  - Successful: ${articles.length}`);
  console.log(`  - Failed: ${urls.length - articles.length}`);
  console.log(`  - Articles with dates: ${articles.filter(a => a.publishedDate).length}\n`);

  return articles;
};
