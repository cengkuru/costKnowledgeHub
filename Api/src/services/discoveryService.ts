import { ObjectId } from 'mongodb';
import { GoogleGenAI, Type } from '@google/genai';
import config from '../config';
import { getDatabase } from '../db';
import {
  Resource,
  ContentStatus,
  ResourceType,
  RESOURCE_TYPES,
  WORKSTREAMS,
  THEMES,
  OC4IDS_SECTIONS,
  COLLECTION_NAME,
} from '../models/Resource';

// Known CoST resource pages to crawl
const DISCOVERY_SOURCES = [
  'https://infrastructuretransparency.org/guidance/',
  'https://infrastructuretransparency.org/resources/',
  'https://infrastructuretransparency.org/tools/',
  'https://infrastructuretransparency.org/publications/',
  'https://standard.open-contracting.org/infrastructure/',
  'https://oc4ids.org/en/',
];

// System user ID for automated operations
const SYSTEM_USER_ID = new ObjectId('000000000000000000000001');

interface ExtractedResource {
  title: string;
  description: string;
  url: string;
  resourceType: string;
  workstreams: string[];
  themes: string[];
  oc4idsAlignment: string[];
  tags: string[];
}

interface DiscoveryResult {
  discovered: number;
  duplicates: number;
  errors: string[];
  resources: ExtractedResource[];
}

/**
 * Discovery Service - Automatically finds and catalogs CoST resources
 */
export const discoveryService = {
  /**
   * Fetch page content using native fetch
   */
  async fetchPage(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': config.crawlerUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(config.crawlerRequestTimeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      throw error;
    }
  },

  /**
   * Extract links from HTML content
   */
  extractLinks(html: string, baseUrl: string): string[] {
    const linkRegex = /href=["']([^"']+)["']/gi;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1];

      // Skip anchors, javascript, mailto, tel
      if (href.startsWith('#') || href.startsWith('javascript:') ||
          href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }

      // Convert relative URLs to absolute
      if (href.startsWith('/')) {
        const url = new URL(baseUrl);
        href = `${url.protocol}//${url.host}${href}`;
      } else if (!href.startsWith('http')) {
        href = new URL(href, baseUrl).href;
      }

      // Filter for document-like URLs (PDFs, docs, specific paths)
      if (this.isResourceUrl(href)) {
        links.push(href);
      }
    }

    return [...new Set(links)]; // Deduplicate
  },

  /**
   * Check if URL likely points to a resource
   */
  isResourceUrl(url: string): boolean {
    const resourcePatterns = [
      /\.pdf$/i,
      /\.docx?$/i,
      /\.xlsx?$/i,
      /\/guidance\//i,
      /\/publications\//i,
      /\/tools\//i,
      /\/resources\//i,
      /\/downloads\//i,
      /oc4ids\.org/i,
      /standard\.open-contracting\.org/i,
    ];

    return resourcePatterns.some(pattern => pattern.test(url));
  },

  /**
   * Use AI to extract metadata from a resource page
   */
  async extractResourceMetadata(
    url: string,
    pageContent: string
  ): Promise<ExtractedResource | null> {
    if (!config.geminiApiKey) {
      console.warn('Gemini API key not configured, skipping AI extraction');
      return null;
    }

    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    // Truncate content to avoid token limits
    const truncatedContent = pageContent.substring(0, 10000);

    const prompt = `
Analyze this webpage and extract metadata for a CoST (Infrastructure Transparency Initiative) Knowledge Hub.

URL: ${url}
Page Content (truncated):
${truncatedContent}

Extract the following information. If unsure, make reasonable inferences based on the content.

Return a JSON object with:
- title: The resource title (clear, descriptive)
- description: A 2-3 sentence description of what this resource is about
- resourceType: One of: ${RESOURCE_TYPES.join(', ')}
- workstreams: Array of relevant workstreams from: ${WORKSTREAMS.join(', ')}
- themes: Array of relevant themes from: ${THEMES.join(', ')}
- oc4idsAlignment: Array of OC4IDS sections from: ${OC4IDS_SECTIONS.join(', ')}
- tags: Array of 3-5 relevant keywords

If this doesn't appear to be a valid CoST resource, return null.
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              resourceType: { type: Type.STRING },
              workstreams: { type: Type.ARRAY, items: { type: Type.STRING } },
              themes: { type: Type.ARRAY, items: { type: Type.STRING } },
              oc4idsAlignment: { type: Type.ARRAY, items: { type: Type.STRING } },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['title', 'description', 'resourceType'],
          },
        },
      });

      const result = JSON.parse(response.text || 'null');
      if (result && result.title) {
        return {
          ...result,
          url,
          workstreams: result.workstreams || [],
          themes: result.themes || [],
          oc4idsAlignment: result.oc4idsAlignment || [],
          tags: result.tags || [],
        };
      }
      return null;
    } catch (error) {
      console.error(`AI extraction failed for ${url}:`, error);
      return null;
    }
  },

  /**
   * Check if a resource already exists in the database
   */
  async resourceExists(url: string): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.collection(COLLECTION_NAME).findOne({ url });
    return !!existing;
  },

  /**
   * Create a slug from title
   */
  createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
  },

  /**
   * Save a discovered resource to the database
   */
  async saveDiscoveredResource(extracted: ExtractedResource): Promise<ObjectId | null> {
    const db = await getDatabase();
    const now = new Date();

    // Validate resource type
    const resourceType = RESOURCE_TYPES.includes(extracted.resourceType as any)
      ? extracted.resourceType
      : 'guidance';

    const resource: Partial<Resource> = {
      title: extracted.title,
      description: extracted.description,
      url: extracted.url,
      slug: this.createSlug(extracted.title),
      resourceType: resourceType as ResourceType,

      // CoST taxonomy
      countryPrograms: ['global'],
      themes: extracted.themes.filter(t => THEMES.includes(t as any)) as any[],
      oc4idsAlignment: extracted.oc4idsAlignment.filter(o => OC4IDS_SECTIONS.includes(o as any)) as any[],
      workstreams: extracted.workstreams.filter(w => WORKSTREAMS.includes(w as any)) as any[],

      // Audience & Access
      audience: ['technical'],
      accessLevel: 'public',
      language: 'en',

      // Multi-language
      isTranslation: false,
      translations: [],

      // Temporal
      publicationDate: now,
      lastVerified: now,

      // Lifecycle - CRITICAL: Start as discovered for admin review
      status: ContentStatus.DISCOVERED,
      statusHistory: [{
        status: ContentStatus.DISCOVERED,
        changedAt: now,
        changedBy: SYSTEM_USER_ID,
        reason: 'Auto-discovered by crawler',
      }],

      // Metadata
      source: 'discovered',
      discoveredFrom: extracted.url,

      // Engagement
      clicks: 0,
      aiCitations: 0,

      // Timestamps
      createdAt: now,
      updatedAt: now,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,

      // Legacy
      tags: extracted.tags,
    };

    try {
      const result = await db.collection(COLLECTION_NAME).insertOne(resource);
      console.log(`Discovered resource saved: ${extracted.title}`);
      return result.insertedId;
    } catch (error) {
      console.error(`Failed to save resource ${extracted.title}:`, error);
      return null;
    }
  },

  /**
   * Run the discovery process for all sources
   */
  async runDiscovery(): Promise<DiscoveryResult> {
    const result: DiscoveryResult = {
      discovered: 0,
      duplicates: 0,
      errors: [],
      resources: [],
    };

    console.log('Starting resource discovery...');

    for (const sourceUrl of DISCOVERY_SOURCES) {
      console.log(`Crawling: ${sourceUrl}`);

      try {
        // Fetch the source page
        const html = await this.fetchPage(sourceUrl);

        // Extract links
        const links = this.extractLinks(html, sourceUrl);
        console.log(`Found ${links.length} potential resource links`);

        // Process each link (with rate limiting)
        for (const link of links.slice(0, 20)) { // Limit to 20 per source
          // Check for duplicates
          if (await this.resourceExists(link)) {
            result.duplicates++;
            continue;
          }

          // Rate limit
          await new Promise(resolve => setTimeout(resolve, config.crawlerRateLimitMs || 1000));

          try {
            // Fetch the resource page
            const pageContent = await this.fetchPage(link);

            // Extract metadata using AI
            const extracted = await this.extractResourceMetadata(link, pageContent);

            if (extracted) {
              // Save to database
              const id = await this.saveDiscoveredResource(extracted);
              if (id) {
                result.discovered++;
                result.resources.push(extracted);
              }
            }
          } catch (error: any) {
            result.errors.push(`${link}: ${error.message}`);
          }
        }
      } catch (error: any) {
        result.errors.push(`${sourceUrl}: ${error.message}`);
      }
    }

    console.log(`Discovery complete. Found ${result.discovered} new resources, ${result.duplicates} duplicates.`);
    return result;
  },

  /**
   * Discover from a specific URL (manual trigger)
   */
  async discoverFromUrl(url: string): Promise<ExtractedResource | null> {
    // Check for duplicate
    if (await this.resourceExists(url)) {
      console.log(`Resource already exists: ${url}`);
      return null;
    }

    try {
      const pageContent = await this.fetchPage(url);
      const extracted = await this.extractResourceMetadata(url, pageContent);

      if (extracted) {
        await this.saveDiscoveredResource(extracted);
        return extracted;
      }
    } catch (error) {
      console.error(`Failed to discover from ${url}:`, error);
    }

    return null;
  },

  /**
   * Get pending discovered resources for admin review
   */
  async getPendingDiscoveries(): Promise<Resource[]> {
    const db = await getDatabase();
    return await db
      .collection<Resource>(COLLECTION_NAME)
      .find({ status: ContentStatus.DISCOVERED })
      .sort({ createdAt: -1 })
      .toArray();
  },

  /**
   * Approve a discovered resource (move to pending_review or published)
   */
  async approveDiscovery(resourceId: ObjectId, userId: ObjectId): Promise<boolean> {
    const db = await getDatabase();
    const now = new Date();

    const result = await db.collection(COLLECTION_NAME).updateOne(
      { _id: resourceId, status: ContentStatus.DISCOVERED },
      {
        $set: {
          status: ContentStatus.PUBLISHED,
          publishedAt: now,
          updatedAt: now,
          updatedBy: userId,
        },
        $push: {
          statusHistory: {
            status: ContentStatus.PUBLISHED,
            changedAt: now,
            changedBy: userId,
            reason: 'Approved and published by admin',
          },
        } as any,
      }
    );

    return result.modifiedCount > 0;
  },

  /**
   * Reject a discovered resource
   */
  async rejectDiscovery(resourceId: ObjectId, userId: ObjectId, reason: string): Promise<boolean> {
    const db = await getDatabase();
    const now = new Date();

    const result = await db.collection(COLLECTION_NAME).updateOne(
      { _id: resourceId, status: ContentStatus.DISCOVERED },
      {
        $set: {
          status: ContentStatus.REJECTED,
          updatedAt: now,
          updatedBy: userId,
        },
        $push: {
          statusHistory: {
            status: ContentStatus.REJECTED,
            changedAt: now,
            changedBy: userId,
            reason,
          },
        } as any,
      }
    );

    return result.modifiedCount > 0;
  },
};

export default discoveryService;
