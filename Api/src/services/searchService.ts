import { getDatabase } from '../db';
import {
  Resource,
  COLLECTION_NAME,
  CountryProgram,
  Theme,
  ResourceType,
  AudienceLevel,
  LanguageCode,
  ContentStatus,
} from '../models/Resource';
import { ObjectId } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { topicService } from './topicService';
import { mapResourceToTopic } from '../utils/topicCategory';

// Initialize Gemini for semantic understanding
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Cache for active topic names (shared with resourceService logic)
let activeTopicNamesCache: Set<string> | null = null;
let cacheLastUpdated: number = 0;
const CACHE_TTL = 60000; // 1 minute

async function getActiveTopicNames(): Promise<Set<string>> {
  const now = Date.now();
  if (activeTopicNamesCache && (now - cacheLastUpdated) < CACHE_TTL) {
    return activeTopicNamesCache;
  }

  const topics = await topicService.listTopics(false); // Only active topics
  activeTopicNamesCache = new Set(topics.map(t => t.name));
  cacheLastUpdated = now;
  return activeTopicNamesCache;
}

// Map workstreams/tags to frontend category names (shared with resourceService)
function mapToFrontendCategory(resource: any, activeTopics?: Set<string>): string {
  return mapResourceToTopic(resource, { activeTopics });
}

// Synonyms for infrastructure transparency domain
const DOMAIN_SYNONYMS: Record<string, string[]> = {
  'assurance': ['review', 'audit', 'verification', 'validation', 'assessment', 'check', 'quality'],
  'oc4ids': ['open contracting', 'data standard', 'ocds', 'infrastructure data', 'disclosure'],
  'transparency': ['openness', 'disclosure', 'accountability', 'visibility', 'clarity'],
  'procurement': ['bidding', 'tendering', 'contracting', 'purchasing', 'acquisition'],
  'infrastructure': ['construction', 'building', 'development', 'project', 'public works'],
  'monitoring': ['tracking', 'oversight', 'supervision', 'observation', 'surveillance'],
  'governance': ['management', 'administration', 'oversight', 'regulation', 'policy'],
  'corruption': ['fraud', 'bribery', 'misconduct', 'irregularities', 'malfeasance'],
  'climate': ['environmental', 'green', 'sustainable', 'carbon', 'emissions'],
  'gender': ['women', 'equality', 'inclusive', 'diversity', 'equity'],
};

/**
 * Search request interface
 */
export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  sort?: 'relevance' | 'date' | 'popularity';
  page?: number;
  limit?: number;
}

/**
 * Search filters interface
 */
export interface SearchFilters {
  resourceTypes?: ResourceType[];
  themes?: Theme[];
  countryPrograms?: CountryProgram[];
  language?: LanguageCode;
  audience?: AudienceLevel[];
  dateRange?: { from?: Date; to?: Date };
}

/**
 * Search result interface
 */
export interface SearchResult {
  resource: Resource;
  score: number;
  highlights?: {
    title?: string[];
    description?: string[];
  };
}

/**
 * Facet count interface
 */
export interface FacetCount {
  value: string;
  count: number;
}

/**
 * Search response interface
 */
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  facets: {
    resourceTypes: FacetCount[];
    themes: FacetCount[];
    countryPrograms: FacetCount[];
    languages: FacetCount[];
  };
  page: number;
  totalPages: number;
}

/**
 * Search service for keyword and semantic search
 */
export const searchService = {
  /**
   * Main search method combining keyword and semantic search
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const {
      query,
      filters = {},
      sort = 'relevance',
      page = 1,
      limit = 20,
    } = request;

    if (!query || query.trim().length === 0) {
      return {
        results: [],
        total: 0,
        facets: {
          resourceTypes: [],
          themes: [],
          countryPrograms: [],
          languages: [],
        },
        page,
        totalPages: 0,
      };
    }

    // Build filter query
    const filterQuery = this.buildFilterQuery(filters);

    // Perform hybrid search
    const results = await this.hybridSearch(query, filters, {
      keyword: 0.6,
      semantic: 0.4,
    });

    // Get total count for pagination
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    const totalCount = await collection.countDocuments({
      ...filterQuery,
      status: ContentStatus.PUBLISHED,
    });

    // Get paginated results
    const skip = (page - 1) * limit;
    const paginatedResults = results.slice(skip, skip + limit);

    // Get facets
    const facets = await this.getFacetsForResults(paginatedResults, filters);

    return {
      results: paginatedResults,
      total: totalCount,
      facets,
      page,
      totalPages: Math.ceil(totalCount / limit),
    };
  },

  /**
   * Keyword search using MongoDB text index
   * Only returns resources from active topics
   */
  async keywordSearch(
    query: string,
    filters?: SearchFilters,
    sort?: 'relevance' | 'date' | 'popularity',
    page?: number,
    limit?: number
  ): Promise<SearchResult[]> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    // Get active topic names
    const activeTopicNames = await getActiveTopicNames();

    // Ensure text index exists
    await this.ensureTextIndex();

    const filterQuery = this.buildFilterQuery(filters);
    const textQuery = {
      $text: { $search: query },
      ...filterQuery,
      status: ContentStatus.PUBLISHED,
    } as any;

    let queryChain = collection.find(textQuery);

    // Apply sorting
    if (sort === 'relevance') {
      queryChain = queryChain.sort({ score: { $meta: 'textScore' } });
    } else if (sort === 'date') {
      queryChain = queryChain.sort({ publicationDate: -1 });
    } else if (sort === 'popularity') {
      queryChain = queryChain.sort({ clicks: -1 });
    }

    // Apply pagination (fetch more to account for topic filtering)
    if (page && limit) {
      const skip = (page - 1) * limit;
      queryChain = queryChain.skip(skip).limit(limit * 2);
    }

    const resources = await queryChain.toArray();

    // Filter by active topics and map results
    const results = resources
      .filter((resource) => {
        const category = mapToFrontendCategory(resource, activeTopicNames);
        return activeTopicNames.has(category);
      })
      .map((resource) => ({
        resource,
        score: resource.clicks || 0,
        highlights: this.generateHighlights(resource, query),
      }));

    // Apply limit after filtering
    return limit ? results.slice(0, limit) : results;
  },

  /**
   * Semantic search using embeddings (basic cosine similarity)
   * Only returns resources from active topics
   */
  async semanticSearch(
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    // Get active topic names
    const activeTopicNames = await getActiveTopicNames();

    const filterQuery = this.buildFilterQuery(filters);

    // Get all published resources with embeddings
    const resources = await collection
      .find({
        ...filterQuery,
        status: ContentStatus.PUBLISHED,
        embedding: { $exists: true },
      } as any)
      .toArray();

    if (resources.length === 0) {
      return [];
    }

    // For basic semantic search without embedding generation,
    // we'll use a simple keyword-based semantic approach
    // In production, you'd generate an embedding for the query using your AI service
    const queryTerms = query.toLowerCase().split(/\s+/);

    // Score resources based on semantic relevance, filtering by active topics
    const scoredResources = resources
      .filter((resource) => {
        const category = mapToFrontendCategory(resource, activeTopicNames);
        return activeTopicNames.has(category);
      })
      .map((resource) => {
        let semanticScore = 0;

        // Calculate semantic relevance based on content
        const content = `${resource.title} ${resource.description} ${resource.tags?.join(' ') || ''} ${resource.themes?.join(' ') || ''}`.toLowerCase();

        // Award points for query term matches
        queryTerms.forEach((term) => {
          const matches = content.split(term).length - 1;
          semanticScore += matches * 0.1;
        });

        // Boost score based on metadata matches
        if (resource.embedding && Array.isArray(resource.embedding)) {
          // If embedding exists, we could do cosine similarity here
          // For now, just indicate that embeddings are considered
          semanticScore += 0.2;
        }

        return {
          resource,
          score: Math.min(semanticScore, 1.0), // Normalize to 0-1
        };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);

    return scoredResources;
  },

  /**
   * Hybrid search combining keyword and semantic results
   */
  async hybridSearch(
    query: string,
    filters?: SearchFilters,
    weights?: { keyword: number; semantic: number }
  ): Promise<SearchResult[]> {
    const { keyword: keywordWeight = 0.6, semantic: semanticWeight = 0.4 } =
      weights || {};

    try {
      // Perform both searches in parallel
      const [keywordResults, semanticResults] = await Promise.all([
        this.keywordSearch(query, filters),
        this.semanticSearch(query, filters),
      ]);

      // Combine results using weights
      const resultMap = new Map<string, SearchResult>();

      // Add keyword results
      keywordResults.forEach((result) => {
        const key = result.resource._id?.toString();
        if (key) {
          const existing = resultMap.get(key);
          const weightedScore = result.score * keywordWeight;
          resultMap.set(key, {
            resource: result.resource,
            score: existing ? existing.score + weightedScore : weightedScore,
            highlights: result.highlights,
          });
        }
      });

      // Add semantic results
      semanticResults.forEach((result) => {
        const key = result.resource._id?.toString();
        if (key) {
          const existing = resultMap.get(key);
          const weightedScore = result.score * semanticWeight;
          resultMap.set(key, {
            resource: result.resource,
            score: existing ? existing.score + weightedScore : weightedScore,
            highlights: result.highlights,
          });
        }
      });

      // Convert to array and sort by score
      return Array.from(resultMap.values()).sort((a, b) => b.score - a.score);
    } catch (error) {
      // Fallback to keyword search if semantic search fails
      console.warn('Semantic search failed, falling back to keyword search:', error);
      return this.keywordSearch(query, filters);
    }
  },

  /**
   * Build MongoDB filter query from search filters
   */
  buildFilterQuery(filters?: SearchFilters): Record<string, any> {
    const query: Record<string, any> = {};

    if (!filters) {
      return query;
    }

    if (filters.resourceTypes && filters.resourceTypes.length > 0) {
      query.resourceType = { $in: filters.resourceTypes };
    }

    if (filters.themes && filters.themes.length > 0) {
      query.themes = { $in: filters.themes };
    }

    if (filters.countryPrograms && filters.countryPrograms.length > 0) {
      query.countryPrograms = { $in: filters.countryPrograms };
    }

    if (filters.language) {
      query.language = filters.language;
    }

    if (filters.audience && filters.audience.length > 0) {
      query.audience = { $in: filters.audience };
    }

    if (filters.dateRange) {
      const dateQuery: Record<string, any> = {};
      if (filters.dateRange.from) {
        dateQuery.$gte = filters.dateRange.from;
      }
      if (filters.dateRange.to) {
        dateQuery.$lte = filters.dateRange.to;
      }
      if (Object.keys(dateQuery).length > 0) {
        query.publicationDate = dateQuery;
      }
    }

    return query;
  },

  /**
   * Get facets for the given results
   */
  async getFacetsForResults(
    results: SearchResult[],
    _filters?: SearchFilters
  ): Promise<SearchResponse['facets']> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    // Get facets for published resources
    const filterQuery = { status: ContentStatus.PUBLISHED };

    const [resourceTypeFacets, themeFacets, countryFacets, languageFacets] =
      await Promise.all([
        this.getFacets(filterQuery, 'resourceType'),
        this.getFacets(filterQuery, 'themes'),
        this.getFacets(filterQuery, 'countryPrograms'),
        this.getFacets(filterQuery, 'language'),
      ]);

    return {
      resourceTypes: resourceTypeFacets,
      themes: themeFacets,
      countryPrograms: countryFacets,
      languages: languageFacets,
    };
  },

  /**
   * Get facet counts for a specific field
   */
  async getFacets(
    filter: Record<string, any>,
    field: string
  ): Promise<FacetCount[]> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    const pipeline = [
      { $match: filter },
      { $unwind: `$${field}` },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    return results.map((doc) => ({
      value: doc._id,
      count: doc.count,
    }));
  },

  /**
   * Generate text highlights for search results
   */
  generateHighlights(
    resource: Resource,
    query: string
  ): SearchResult['highlights'] {
    const terms = query.toLowerCase().split(/\s+/);
    const highlights: SearchResult['highlights'] = {};

    // Highlight in title
    if (resource.title) {
      const titleMatches = this.findMatches(resource.title, terms);
      if (titleMatches.length > 0) {
        highlights.title = titleMatches;
      }
    }

    // Highlight in description
    if (resource.description) {
      const descMatches = this.findMatches(resource.description, terms);
      if (descMatches.length > 0) {
        highlights.description = descMatches;
      }
    }

    return highlights;
  },

  /**
   * Find matching snippets in text
   */
  findMatches(text: string | undefined, terms: string[]): string[] {
    if (!text) {
      return [];
    }

    const matches: string[] = [];
    const sentences = text.split(/[.!?]+/);

    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();
      if (terms.some((term) => lower.includes(term))) {
        const trimmed = sentence.trim();
        if (trimmed && matches.length < 3) {
          // Limit to 3 highlights
          matches.push(trimmed.substring(0, 150)); // Limit to 150 chars
        }
      }
    });

    return matches;
  },

  /**
   * Ensure text index exists on collection
   */
  async ensureTextIndex(): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    try {
      // Create compound text index with weights
      await collection.createIndex(
        {
          title: 'text',
          description: 'text',
          tags: 'text',
          themes: 'text',
        },
        {
          weights: {
            title: 10,
            description: 5,
            tags: 3,
            themes: 2,
          },
          name: 'resource_text_index',
        }
      );
    } catch (error) {
      // Index might already exist
      console.warn('Text index creation warning:', error);
    }
  },
};
