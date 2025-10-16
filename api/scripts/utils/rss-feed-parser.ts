/**
 * RSS Feed Parser for Blog/News Content
 *
 * Parses RSS/Atom feeds to extract latest articles with publication dates
 * Enables real-time news monitoring and "latest content" searches
 */

import axios from 'axios';

export interface RSSFeedItem {
  title: string;
  url: string;
  summary: string;
  content: string;
  publishedDate: Date;
  author?: string;
  categories?: string[];
}

export interface RSSFeedConfig {
  feedUrl: string;
  type?: 'rss' | 'atom' | 'auto';
  maxItems?: number;
}

/**
 * Extract text content from HTML/XML
 */
const extractTextContent = (html: string): string => {
  // Remove CDATA tags
  let text = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

  // Remove HTML tags
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities (comprehensive)
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

  // Clean whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');

  return text.trim();
};

/**
 * Parse RSS 2.0 feed
 */
const parseRSS = (xml: string): RSSFeedItem[] => {
  const items: RSSFeedItem[] = [];

  // Extract items using regex (simple parser for RSS)
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    const itemXml = match[1];

    // Extract fields
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/);
    const contentMatch = itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/) ||
                         itemXml.match(/<content>([\s\S]*?)<\/content>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const authorMatch = itemXml.match(/<(?:dc:)?creator>([\s\S]*?)<\/(?:dc:)?creator>/) ||
                        itemXml.match(/<author>([\s\S]*?)<\/author>/);

    // Extract categories
    const categoryMatches = itemXml.matchAll(/<category>([\s\S]*?)<\/category>/g);
    const categories = Array.from(categoryMatches).map(m => extractTextContent(m[1]));

    if (titleMatch && linkMatch) {
      const title = extractTextContent(titleMatch[1]);
      const url = linkMatch[1].trim();
      const description = descMatch ? extractTextContent(descMatch[1]) : '';
      const content = contentMatch ? extractTextContent(contentMatch[1]) : description;
      const pubDate = pubDateMatch ? new Date(pubDateMatch[1].trim()) : new Date();
      const author = authorMatch ? extractTextContent(authorMatch[1]) : undefined;

      items.push({
        title,
        url,
        summary: description.slice(0, 300),
        content,
        publishedDate: pubDate,
        author,
        categories: categories.length > 0 ? categories : undefined
      });
    }
  }

  return items;
};

/**
 * Parse Atom feed
 */
const parseAtom = (xml: string): RSSFeedItem[] => {
  const items: RSSFeedItem[] = [];

  const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);

  for (const match of entryMatches) {
    const entryXml = match[1];

    const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = entryXml.match(/<link[^>]*href=["'](.*?)["'][^>]*\/?>/);
    const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
    const contentMatch = entryXml.match(/<content>([\s\S]*?)<\/content>/);
    const publishedMatch = entryXml.match(/<published>([\s\S]*?)<\/published>/) ||
                           entryXml.match(/<updated>([\s\S]*?)<\/updated>/);
    const authorMatch = entryXml.match(/<author><name>([\s\S]*?)<\/name><\/author>/);

    if (titleMatch && linkMatch) {
      const title = extractTextContent(titleMatch[1]);
      const url = linkMatch[1].trim();
      const summary = summaryMatch ? extractTextContent(summaryMatch[1]) : '';
      const content = contentMatch ? extractTextContent(contentMatch[1]) : summary;
      const pubDate = publishedMatch ? new Date(publishedMatch[1].trim()) : new Date();
      const author = authorMatch ? extractTextContent(authorMatch[1]) : undefined;

      items.push({
        title,
        url,
        summary: summary.slice(0, 300),
        content,
        publishedDate: pubDate,
        author
      });
    }
  }

  return items;
};

/**
 * Fetch and parse RSS/Atom feed
 */
export const parseFeed = async (config: RSSFeedConfig): Promise<RSSFeedItem[]> => {
  const { feedUrl, type = 'auto', maxItems } = config;

  try {
    console.log(`📡 Fetching feed: ${feedUrl}`);

    const response = await axios.get(feedUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'CoST-Knowledge-Hub-RSS-Parser/1.0'
      }
    });

    const xml = response.data;

    // Auto-detect feed type
    let feedType = type;
    if (type === 'auto') {
      feedType = xml.includes('<rss') ? 'rss' : 'atom';
    }

    console.log(`📰 Parsing ${feedType.toUpperCase()} feed...`);

    const items = feedType === 'rss' ? parseRSS(xml) : parseAtom(xml);

    // Sort by date (newest first)
    items.sort((a, b) => b.publishedDate.getTime() - a.publishedDate.getTime());

    // Apply limit if specified
    const limitedItems = maxItems ? items.slice(0, maxItems) : items;

    console.log(`✅ Parsed ${limitedItems.length} items from feed`);

    return limitedItems;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`❌ Failed to fetch feed: ${error.message}`);
    } else {
      console.error(`❌ Error parsing feed:`, error);
    }
    return [];
  }
};

/**
 * Get articles published after a specific date
 */
export const getArticlesSince = async (
  feedUrl: string,
  since: Date
): Promise<RSSFeedItem[]> => {
  const allItems = await parseFeed({ feedUrl });
  return allItems.filter(item => item.publishedDate >= since);
};

/**
 * Get latest N articles
 */
export const getLatestArticles = async (
  feedUrl: string,
  count: number = 10
): Promise<RSSFeedItem[]> => {
  return parseFeed({ feedUrl, maxItems: count });
};
