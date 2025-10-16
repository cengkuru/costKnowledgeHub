/**
 * Web Crawler for CoST Infrastructure Transparency Sites
 *
 * Fetches real content from CoST websites including:
 * - Manuals and guides
 * - Templates
 * - Assurance reports
 * - Impact stories
 * - Resources
 */

import axios from 'axios';

export interface CrawledDocument {
  title: string;
  type: 'Manual' | 'Template' | 'Assurance Report' | 'Guide' | 'Impact Story' | 'Resource';
  summary: string;
  content: string;
  url: string;
  country?: string;
  year?: number;
  metadata: {
    source: string;
    crawledAt: Date;
  };
}

/**
 * Extract text content from HTML
 * Removes scripts, styles, and navigation elements
 */
export const extractTextFromHtml = (html: string): string => {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML tags but preserve spacing
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities (comprehensive list)
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&#8211;/g, '–'); // en dash
  text = text.replace(/&#8212;/g, '—'); // em dash
  text = text.replace(/&#8216;/g, '''); // left single quote
  text = text.replace(/&#8217;/g, '''); // right single quote
  text = text.replace(/&#8220;/g, '"'); // left double quote
  text = text.replace(/&#8221;/g, '"'); // right double quote
  text = text.replace(/&#8230;/g, '…'); // ellipsis
  text = text.replace(/&mdash;/g, '—'); // em dash (named)
  text = text.replace(/&ndash;/g, '–'); // en dash (named)
  text = text.replace(/&rsquo;/g, '''); // right single quote (named)
  text = text.replace(/&lsquo;/g, '''); // left single quote (named)
  text = text.replace(/&rdquo;/g, '"'); // right double quote (named)
  text = text.replace(/&ldquo;/g, '"'); // left double quote (named)
  text = text.replace(/&hellip;/g, '…'); // ellipsis (named)

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();

  return text;
};

/**
 * Decode HTML entities in a string
 */
const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, ''')
    .replace(/&#8217;/g, ''')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, ''')
    .replace(/&lsquo;/g, ''')
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&hellip;/g, '…');
};

/**
 * Extract title from HTML
 */
export const extractTitle = (html: string): string => {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return decodeHtmlEntities(titleMatch[1].trim());

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return decodeHtmlEntities(h1Match[1].trim());

  return 'Untitled Document';
};

/**
 * Curated list of CoST resources to crawl
 * These are real, publicly accessible resources
 */
export const COST_RESOURCES = [
  // OC4IDS Documentation
  {
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/',
    title: 'OC4IDS: Open Contracting for Infrastructure Data Standard',
    type: 'Manual' as const,
    summary: 'Complete documentation for the Open Contracting for Infrastructure Data Standard (OC4IDS), including schema reference, implementation guidance, and examples.',
    country: undefined,
    year: 2024
  },
  {
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/guidance/',
    title: 'OC4IDS Implementation Guidance',
    type: 'Guide' as const,
    summary: 'Practical guidance for implementing OC4IDS including data mapping, publication workflows, and use case examples.',
    country: undefined,
    year: 2024
  },
  {
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/reference/',
    title: 'OC4IDS Schema Reference',
    type: 'Manual' as const,
    summary: 'Technical reference for OC4IDS schema including project, process, and completion information.',
    country: undefined,
    year: 2024
  },

  // CoST Infrastructure Transparency Initiative
  {
    url: 'https://infrastructuretransparency.org/our-approach/',
    title: 'CoST Approach to Infrastructure Transparency',
    type: 'Guide' as const,
    summary: 'Overview of CoST methodology for promoting transparency and accountability in infrastructure projects.',
    country: undefined,
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/resources/',
    title: 'CoST Resource Library',
    type: 'Resource' as const,
    summary: 'Comprehensive library of CoST resources including guidance notes, templates, and case studies.',
    country: undefined,
    year: 2024
  },

  // Sample Impact Stories
  {
    url: 'https://infrastructuretransparency.org/costimpact/',
    title: 'CoST Impact Stories',
    type: 'Impact Story' as const,
    summary: 'Real-world examples of how CoST has improved infrastructure transparency and outcomes in member countries.',
    country: undefined,
    year: 2024
  },

  // Tools and Standards
  {
    url: 'https://infrastructuretransparency.org/tools-and-standards/',
    title: 'CoST Tools and Standards',
    type: 'Guide' as const,
    summary: 'Tools, templates, and standards for implementing infrastructure transparency and disclosure.',
    country: undefined,
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/cost-guidance/',
    title: 'CoST Implementation Guidance',
    type: 'Guide' as const,
    summary: 'Practical guidance for implementing CoST standards and best practices.',
    country: undefined,
    year: 2024
  }
];

/**
 * Fetch and parse a single web page
 */
export const crawlPage = async (
  resource: typeof COST_RESOURCES[0]
): Promise<CrawledDocument | null> => {
  try {
    console.log(`Crawling: ${resource.url}`);

    const response = await axios.get(resource.url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'CoST-Knowledge-Hub-Crawler/1.0 (Infrastructure Transparency Data Collection)'
      }
    });

    const html = response.data;
    const content = extractTextFromHtml(html);

    // Skip if content too short (likely error page)
    if (content.length < 200) {
      console.warn(`Skipped ${resource.url}: content too short`);
      return null;
    }

    // Extract actual title if not provided
    const title = resource.title || extractTitle(html);

    return {
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
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.error(`⚠️  404 Not Found: ${resource.url}`);
        console.error(`   Title: ${resource.title}`);
      } else if (error.response) {
        console.error(`❌ Failed to crawl ${resource.url}: HTTP ${error.response.status} ${error.response.statusText}`);
      } else {
        console.error(`❌ Failed to crawl ${resource.url}: ${error.message}`);
      }
    } else {
      console.error(`❌ Unexpected error crawling ${resource.url}:`, error);
    }
    return null;
  }
};

/**
 * Crawl all configured resources with rate limiting
 */
export const crawlAllResources = async (
  resources = COST_RESOURCES,
  delayMs = 1000 // 1 second delay between requests
): Promise<CrawledDocument[]> => {
  const documents: CrawledDocument[] = [];

  for (const resource of resources) {
    const doc = await crawlPage(resource);
    if (doc) {
      documents.push(doc);
    }

    // Rate limiting: wait before next request
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\nCrawled ${documents.length} of ${resources.length} resources`);
  return documents;
};

/**
 * Crawl with retry logic
 */
export const crawlWithRetry = async (
  resource: typeof COST_RESOURCES[0],
  maxRetries = 3
): Promise<CrawledDocument | null> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const doc = await crawlPage(resource);
    if (doc) return doc;

    if (attempt < maxRetries) {
      console.log(`Retry ${attempt}/${maxRetries - 1} for ${resource.url}`);
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }

  return null;
};
