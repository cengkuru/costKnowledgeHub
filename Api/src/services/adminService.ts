import { getDatabase } from '../db';
import { Resource, ResourceInputSchema, ContentStatus, StatusChange, COLLECTION_NAME } from '../models/Resource';
import { Category, CATEGORIES_COLLECTION_NAME } from '../models/Category';
import { ApiError } from '../middleware/errorHandler';
import { ObjectId } from 'mongodb';
import { embeddingService } from './embeddingService';
import { chat } from './claudeService';

export interface ListQuery {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  topic?: string;
  type?: string;
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  semantic?: boolean; // Enable semantic search
}

// Domain-specific synonyms for infrastructure transparency
const DOMAIN_SYNONYMS: Record<string, string[]> = {
  'assurance': ['review', 'audit', 'verification', 'validation', 'assessment', 'evaluation'],
  'review': ['assurance', 'audit', 'assessment', 'evaluation', 'verification'],
  'transparency': ['openness', 'disclosure', 'accountability', 'visibility'],
  'procurement': ['bidding', 'tendering', 'contracting', 'purchasing', 'acquisition'],
  'infrastructure': ['projects', 'construction', 'public works', 'development'],
  'corruption': ['fraud', 'bribery', 'integrity', 'anti-corruption'],
  'data': ['information', 'statistics', 'records', 'documents'],
  'standard': ['guidelines', 'framework', 'specification', 'protocol', 'oc4ids'],
  'oc4ids': ['standard', 'data standard', 'open contracting', 'schema'],
  'cost': ['cost', 'budget', 'spending', 'expenditure', 'finance'],
  'monitor': ['monitoring', 'tracking', 'oversight', 'supervision'],
  'report': ['reporting', 'documentation', 'findings', 'analysis'],
};

export interface ListResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  [ContentStatus.DISCOVERED]: [ContentStatus.PENDING_REVIEW, ContentStatus.REJECTED],
  [ContentStatus.PENDING_REVIEW]: [ContentStatus.APPROVED, ContentStatus.REJECTED],
  [ContentStatus.APPROVED]: [ContentStatus.PUBLISHED, ContentStatus.REJECTED],
  [ContentStatus.PUBLISHED]: [ContentStatus.ARCHIVED],
  [ContentStatus.ARCHIVED]: [ContentStatus.PUBLISHED],
  [ContentStatus.REJECTED]: [ContentStatus.PENDING_REVIEW],
};

export const adminService = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<{ total: number; published: number; pending: number; archived: number }> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    const [total, published, pending, archived] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ status: ContentStatus.PUBLISHED }),
      collection.countDocuments({ status: ContentStatus.PENDING_REVIEW }),
      collection.countDocuments({ status: ContentStatus.ARCHIVED }),
    ]);

    return { total, published, pending, archived };
  },

  /**
   * List all resources with pagination, filtering, and search
   */
  async listResources(
    query: ListQuery
  ): Promise<ListResponse<Resource>> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (query.status) {
      if (!Object.values(ContentStatus).includes(query.status as any)) {
        throw new ApiError(400, `Invalid status: ${query.status}`);
      }
      filter.status = query.status;
    }

    if (query.category) {
      try {
        filter.category = new ObjectId(query.category);
      } catch {
        throw new ApiError(400, 'Invalid category ID');
      }
    }

    if (query.type) {
      filter.resourceType = query.type;
    }

    if (query.topic) {
      // Filter by topic name - check both category field and topics array
      filter.$or = [
        { category: query.topic },
        { topics: query.topic }
      ];
    }

    if (query.q) {
      // Search in title and description
      const searchCondition = {
        $or: [
          { title: { $regex: query.q, $options: 'i' } },
          { description: { $regex: query.q, $options: 'i' } },
        ]
      };

      // If topic filter is also set, combine with $and
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          searchCondition
        ];
        delete filter.$or;
      } else {
        filter.$or = searchCondition.$or;
      }
    }

    // Build sort
    let sortOrder: Record<string, 1 | -1> = { createdAt: -1 };
    if (query.sort) {
      const order = query.order === 'asc' ? 1 : -1;
      sortOrder = { [query.sort]: order };
    }

    // Execute queries
    const [resources, total] = await Promise.all([
      collection
        .find(filter)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    return {
      data: resources,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Get single resource by ID
   */
  async getResource(id: string): Promise<Resource> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    let resourceId: ObjectId;
    try {
      resourceId = new ObjectId(id);
    } catch {
      throw new ApiError(400, 'Invalid resource ID format');
    }

    const resource = await collection.findOne({ _id: resourceId });

    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }

    return resource;
  },

  /**
   * Create a new resource
   */
  async createResource(
    data: any,
    userId: string
  ): Promise<Resource> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    // Convert category string to ObjectId if needed
    let categoryId: ObjectId | null = null;
    if (data.category) {
      try {
        categoryId = new ObjectId(data.category);
        data.category = categoryId;
      } catch {
        throw new ApiError(400, 'Invalid category ID format');
      }

      // Verify category exists
      const categoryCollection = db.collection<Category>(CATEGORIES_COLLECTION_NAME);
      const category = await categoryCollection.findOne({ _id: categoryId });
      if (!category) {
        throw new ApiError(400, 'Category not found');
      }
    }

    // Validate input
    try {
      ResourceInputSchema.parse(data);
    } catch (error) {
      throw new ApiError(400, `Validation error: ${error}`);
    }

    const userObjectId = new ObjectId(userId);
    const now = new Date();

    const newResource: Resource = {
      ...data,
      category: new ObjectId(data.category),
      status: ContentStatus.PENDING_REVIEW,
      source: 'manual',
      clicks: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: userObjectId,
      updatedBy: userObjectId,
      statusHistory: [
        {
          status: ContentStatus.PENDING_REVIEW,
          changedAt: now,
          changedBy: userObjectId,
          reason: 'Resource created',
        },
      ],
    };

    const result = await collection.insertOne(newResource);

    return {
      ...newResource,
      _id: result.insertedId,
    };
  },

  /**
   * Update a resource (non-status fields)
   */
  async updateResource(
    id: string,
    data: any,
    userId: string
  ): Promise<Resource> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    let resourceId: ObjectId;
    try {
      resourceId = new ObjectId(id);
    } catch {
      throw new ApiError(400, 'Invalid resource ID format');
    }

    const resource = await collection.findOne({ _id: resourceId });
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }

    // Don't allow status changes via this endpoint
    if (data.status) {
      throw new ApiError(400, 'Use /status endpoint to change resource status');
    }

    // Category is now stored as a string (topic name), not ObjectId
    // No conversion needed - just pass through the string value

    const userObjectId = new ObjectId(userId);
    const updates: any = {
      ...data,
      updatedAt: new Date(),
      updatedBy: userObjectId,
    };

    // Category is stored as string, no conversion needed

    const result = await collection.findOneAndUpdate(
      { _id: resourceId },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ApiError(404, 'Resource not found');
    }

    return result;
  },

  /**
   * Delete a resource (soft delete to archived state)
   */
  async deleteResource(id: string, userId: string): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    let resourceId: ObjectId;
    try {
      resourceId = new ObjectId(id);
    } catch {
      throw new ApiError(400, 'Invalid resource ID format');
    }

    const resource = await collection.findOne({ _id: resourceId });
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }

    const userObjectId = new ObjectId(userId);
    const now = new Date();

    const statusChange: StatusChange = {
      status: ContentStatus.ARCHIVED,
      changedAt: now,
      changedBy: userObjectId,
      reason: 'Resource deleted by admin',
    };

    const result = await collection.findOneAndUpdate(
      { _id: resourceId },
      {
        $set: {
          status: ContentStatus.ARCHIVED,
          archivedAt: now,
          archivedReason: 'Deleted by admin',
          updatedAt: now,
          updatedBy: userObjectId,
        },
        $push: { statusHistory: statusChange },
      }
    );

    if (!result) {
      throw new ApiError(404, 'Resource not found');
    }
  },

  /**
   * Update resource status with transition validation
   */
  async updateStatus(
    id: string,
    newStatus: string,
    userId: string,
    reason?: string
  ): Promise<Resource> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    let resourceId: ObjectId;
    try {
      resourceId = new ObjectId(id);
    } catch {
      throw new ApiError(400, 'Invalid resource ID format');
    }

    const resource = await collection.findOne({ _id: resourceId });
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }

    // Validate new status
    if (!Object.values(ContentStatus).includes(newStatus as any)) {
      throw new ApiError(400, `Invalid status: ${newStatus}`);
    }

    // Validate transition
    const currentStatus = resource.status || ContentStatus.DISCOVERED;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new ApiError(
        400,
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`
      );
    }

    const userObjectId = new ObjectId(userId);
    const now = new Date();

    const statusChange: StatusChange = {
      status: newStatus as ContentStatus,
      changedAt: now,
      changedBy: userObjectId,
      reason,
    };

    const updateData: any = {
      status: newStatus,
      updatedAt: now,
      updatedBy: userObjectId,
    };

    // Set published/archived timestamps
    if (newStatus === ContentStatus.PUBLISHED) {
      updateData.publishedAt = now;
    } else if (newStatus === ContentStatus.ARCHIVED) {
      updateData.archivedAt = now;
      updateData.archivedReason = reason || 'Archived by admin';
    }

    const result = await collection.findOneAndUpdate(
      { _id: resourceId },
      {
        $set: updateData,
        $push: { statusHistory: statusChange },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ApiError(404, 'Resource not found');
    }

    return result;
  },

  /**
   * List all categories
   */
  async listCategories(): Promise<Category[]> {
    const db = await getDatabase();
    const collection = db.collection<Category>(CATEGORIES_COLLECTION_NAME);

    return collection.find({}).sort({ name: 1 }).toArray();
  },

  /**
   * Create a new category
   */
  async createCategory(name: string, description?: string): Promise<Category> {
    const db = await getDatabase();
    const collection = db.collection<Category>(CATEGORIES_COLLECTION_NAME);

    if (!name || name.trim().length === 0) {
      throw new ApiError(400, 'Category name is required');
    }

    if (name.length > 100) {
      throw new ApiError(400, 'Category name must be 100 characters or less');
    }

    // Check for duplicates
    const existing = await collection.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
    });

    if (existing) {
      throw new ApiError(409, 'Category with this name already exists');
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Get the max order
    const maxOrderDoc = await collection
      .findOne({}, { sort: { order: -1 } });
    const order = (maxOrderDoc?.order || 0) + 1;

    const now = new Date();
    const newCategory: Category = {
      name,
      slug,
      description,
      order,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newCategory);

    return {
      ...newCategory,
      _id: result.insertedId,
    };
  },

  /**
   * Update a category
   */
  async updateCategory(
    id: string,
    name?: string,
    description?: string
  ): Promise<Category> {
    const db = await getDatabase();
    const collection = db.collection<Category>(CATEGORIES_COLLECTION_NAME);

    let categoryId: ObjectId;
    try {
      categoryId = new ObjectId(id);
    } catch {
      throw new ApiError(400, 'Invalid category ID format');
    }

    const category = await collection.findOne({ _id: categoryId });
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const updates: any = { updatedAt: new Date() };

    if (name !== undefined) {
      if (name.trim().length === 0) {
        throw new ApiError(400, 'Category name is required');
      }
      if (name.length > 100) {
        throw new ApiError(400, 'Category name must be 100 characters or less');
      }

      // Check for duplicates
      const existing = await collection.findOne({
        _id: { $ne: categoryId },
        name: { $regex: `^${name}$`, $options: 'i' },
      });

      if (existing) {
        throw new ApiError(409, 'Category with this name already exists');
      }

      updates.name = name;

      // Generate slug from name
      updates.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (description !== undefined) {
      updates.description = description;
    }

    const result = await collection.findOneAndUpdate(
      { _id: categoryId },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ApiError(404, 'Category not found');
    }

    return result;
  },

  /**
   * Delete a category (only if no resources use it)
   */
  async deleteCategory(id: string): Promise<void> {
    const db = await getDatabase();
    const categoryCollection = db.collection<Category>(CATEGORIES_COLLECTION_NAME);
    const resourceCollection = db.collection<Resource>(COLLECTION_NAME);

    let categoryId: ObjectId;
    try {
      categoryId = new ObjectId(id);
    } catch {
      throw new ApiError(400, 'Invalid category ID format');
    }

    // Check if category exists
    const category = await categoryCollection.findOne({ _id: categoryId });
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Check if any resources use this category
    const resourceCount = await resourceCollection.countDocuments({
      category: categoryId,
    });

    if (resourceCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete category with ${resourceCount} resource(s). Please reassign or delete resources first.`
      );
    }

    const result = await categoryCollection.deleteOne({ _id: categoryId });

    if (result.deletedCount === 0) {
      throw new ApiError(500, 'Failed to delete category');
    }
  },

  /**
   * Expand query using domain synonyms
   */
  expandQueryWithSynonyms(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/);
    const expandedTerms = new Set<string>();

    // Add original query
    expandedTerms.add(query);

    // Add synonyms for each word
    for (const word of words) {
      expandedTerms.add(word);
      const synonyms = DOMAIN_SYNONYMS[word];
      if (synonyms) {
        for (const synonym of synonyms) {
          expandedTerms.add(synonym);
        }
      }
    }

    return Array.from(expandedTerms);
  },

  /**
   * Use Claude Haiku to expand and understand query intent
   */
  async expandQueryWithAI(query: string): Promise<{
    expandedTerms: string[];
    intent: string;
    filters?: Record<string, string>;
  }> {
    try {
      const systemPrompt = `You are a search assistant for an Infrastructure Transparency Knowledge Hub.
Your task is to expand search queries to find relevant resources about infrastructure transparency, open contracting, and public procurement.

Respond ONLY with valid JSON:
{
  "expandedTerms": ["term1", "term2", ...], // Include original query words plus synonyms and related terms
  "intent": "brief description of what user is looking for",
  "filters": {} // Optional: suggest filters like {"resourceType": "guidance"} or {"country": "uganda"}
}

Domain context:
- OC4IDS = Open Contracting for Infrastructure Data Standard
- CoST = Construction Sector Transparency Initiative
- Assurance = Independent review/audit of infrastructure projects
- MSG = Multi-Stakeholder Group`;

      const response = await chat(
        [{ role: 'user', content: `Expand this search query for finding infrastructure transparency resources: "${query}"` }],
        'haiku',
        systemPrompt
      );

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          expandedTerms: Array.isArray(result.expandedTerms) ? result.expandedTerms : [query],
          intent: result.intent || query,
          filters: result.filters || {}
        };
      }
    } catch (error) {
      console.error('AI query expansion failed, falling back to synonym expansion:', error);
    }

    // Fallback to synonym expansion
    return {
      expandedTerms: this.expandQueryWithSynonyms(query),
      intent: query,
      filters: {}
    };
  },

  /**
   * Semantic search using embeddings for similarity matching
   */
  async semanticSearch(
    query: ListQuery
  ): Promise<ListResponse<Resource & { score?: number }>> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    if (!query.q) {
      // No search query, fall back to regular list
      return this.listResources(query);
    }

    // Step 1: Expand query with AI understanding
    const { expandedTerms, intent, filters: suggestedFilters } = await this.expandQueryWithAI(query.q);
    console.log(`[SemanticSearch] Query: "${query.q}" -> Intent: "${intent}"`);
    console.log(`[SemanticSearch] Expanded terms:`, expandedTerms.slice(0, 10));

    // Build base filter (status, type, topic, category)
    const baseFilter: any = {};

    if (query.status) {
      baseFilter.status = query.status;
    }
    if (query.type) {
      baseFilter.resourceType = query.type;
    }
    if (query.topic) {
      baseFilter.topics = query.topic;
    }
    if (query.category) {
      try {
        baseFilter.category = new ObjectId(query.category);
      } catch {
        // Invalid category ID, ignore
      }
    }

    // Step 2: Try vector search first if resources have embeddings
    let vectorResults: (Resource & { score: number })[] = [];

    try {
      // Generate embedding for search query
      const queryEmbedding = await embeddingService.generateEmbedding(
        `${query.q} ${expandedTerms.slice(0, 5).join(' ')}`
      );

      // Check if vector index exists and resources have embeddings
      const resourceWithEmbedding = await collection.findOne({ embedding: { $exists: true } });

      if (resourceWithEmbedding) {
        // Use vector search with MongoDB Atlas
        const vectorPipeline = [
          {
            $vectorSearch: {
              index: 'resource_vector_index',
              path: 'embedding',
              queryVector: queryEmbedding,
              numCandidates: 200,
              limit: 100,
              filter: Object.keys(baseFilter).length > 0 ? baseFilter : undefined
            }
          },
          {
            $addFields: {
              score: { $meta: 'vectorSearchScore' }
            }
          }
        ];

        try {
          vectorResults = await collection.aggregate<Resource & { score: number }>(vectorPipeline).toArray();
          console.log(`[SemanticSearch] Vector search returned ${vectorResults.length} results`);
        } catch (vectorError) {
          console.log('[SemanticSearch] Vector index not available, using text search fallback');
        }
      }
    } catch (embeddingError) {
      console.log('[SemanticSearch] Embedding generation failed, using text search');
    }

    // Step 3: Text-based semantic search (using expanded terms)
    const textSearchConditions = expandedTerms.flatMap(term => [
      { title: { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } },
      { tags: { $regex: term, $options: 'i' } }
    ]);

    const textFilter = {
      ...baseFilter,
      $or: textSearchConditions
    };

    const [textResults, total] = await Promise.all([
      collection.find(textFilter).limit(100).toArray(),
      collection.countDocuments(textFilter)
    ]);

    // Step 4: Merge and score results
    const scoredResults = new Map<string, Resource & { score: number }>();

    // Add vector results with their scores
    for (const result of vectorResults) {
      scoredResults.set(result._id!.toString(), {
        ...result,
        score: result.score * 0.7 // Vector score weight: 70%
      });
    }

    // Add/merge text results
    for (const result of textResults) {
      const id = result._id!.toString();
      const existing = scoredResults.get(id);

      // Calculate text relevance score
      const queryLower = query.q.toLowerCase();
      const titleMatch = result.title.toLowerCase().includes(queryLower) ? 0.3 : 0;
      const descMatch = result.description?.toLowerCase().includes(queryLower) ? 0.15 : 0;

      // Check expanded terms
      let expandedScore = 0;
      for (const term of expandedTerms) {
        if (result.title.toLowerCase().includes(term.toLowerCase())) expandedScore += 0.05;
        if (result.description?.toLowerCase().includes(term.toLowerCase())) expandedScore += 0.02;
      }
      expandedScore = Math.min(expandedScore, 0.2); // Cap at 0.2

      const textScore = titleMatch + descMatch + expandedScore;

      if (existing) {
        // Combine scores
        existing.score = existing.score + textScore * 0.3; // Text weight: 30%
      } else {
        scoredResults.set(id, {
          ...result,
          score: textScore
        });
      }
    }

    // Sort by score and paginate
    const sortedResults = Array.from(scoredResults.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const paginatedResults = sortedResults.slice(skip, skip + limit);

    return {
      data: paginatedResults,
      page,
      limit,
      total: sortedResults.length,
      totalPages: Math.ceil(sortedResults.length / limit)
    };
  },

  /**
   * Get description statistics
   */
  async getDescriptionStats(): Promise<{
    total: number;
    withDescription: number;
    withoutDescription: number;
    locked: number;
    aiGenerated: number;
    manual: number;
    discovery: number;
  }> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    const [
      total,
      withoutDescription,
      locked,
      aiGenerated,
      manual,
      discovery
    ] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({
        $or: [
          { description: { $exists: false } },
          { description: '' },
          { description: { $regex: /^.{0,20}$/ } } // Less than 20 chars
        ]
      }),
      collection.countDocuments({ descriptionLocked: true }),
      collection.countDocuments({ descriptionSource: 'ai' }),
      collection.countDocuments({
        $or: [
          { descriptionSource: 'manual' },
          { descriptionSource: { $exists: false } }
        ]
      }),
      collection.countDocuments({ descriptionSource: 'discovery' })
    ]);

    return {
      total,
      withDescription: total - withoutDescription,
      withoutDescription,
      locked,
      aiGenerated,
      manual: manual - aiGenerated - discovery, // Subtract AI and discovery to get actual manual
      discovery
    };
  },

  /**
   * Find resources with broken URLs
   * Checks each URL with a HEAD request to verify accessibility
   */
  async findBrokenResourceUrls(limit: number = 100): Promise<(Resource & { error: string })[]> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    // Get resources to check (prioritize published ones)
    const resources = await collection
      .find({ status: { $ne: ContentStatus.ARCHIVED } })
      .sort({ status: 1, updatedAt: -1 })
      .limit(limit)
      .toArray();

    const brokenResources: (Resource & { error: string })[] = [];

    // Check URLs in parallel with concurrency limit
    const batchSize = 10;
    for (let i = 0; i < resources.length; i += batchSize) {
      const batch = resources.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (resource) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(resource.url, {
              method: 'HEAD',
              signal: controller.signal,
              headers: {
                'User-Agent': 'InfraLens-URLChecker/1.0'
              }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              return {
                ...resource,
                error: `HTTP ${response.status}: ${response.statusText}`
              };
            }
            return null;
          } catch (err: any) {
            const errorMessage = err.name === 'AbortError'
              ? 'Timeout: URL took too long to respond'
              : err.message || 'Unknown error';
            return {
              ...resource,
              error: errorMessage
            };
          }
        })
      );

      for (const result of results) {
        if (result) {
          brokenResources.push(result);
        }
      }

      // Small delay between batches
      if (i + batchSize < resources.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return brokenResources;
  },

  /**
   * Cleanup broken resources by archiving or deleting them
   */
  async cleanupBrokenResources(
    userId: string,
    action: 'archive' | 'delete'
  ): Promise<{ processed: number; failed: number; errors: string[] }> {
    const brokenResources = await this.findBrokenResourceUrls(500);

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const resource of brokenResources) {
      try {
        if (action === 'delete') {
          await this.deleteResource(resource._id!.toString(), userId);
        } else {
          await this.updateStatus(
            resource._id!.toString(),
            ContentStatus.ARCHIVED,
            userId,
            `Archived due to broken URL: ${resource.error}`
          );
        }
        processed++;
        console.log(`[Cleanup] ${action === 'delete' ? 'Deleted' : 'Archived'}: ${resource.title}`);
      } catch (err: any) {
        failed++;
        errors.push(`${resource.title}: ${err.message}`);
        console.error(`[Cleanup] Failed for ${resource.title}:`, err.message);
      }
    }

    return {
      processed,
      failed,
      errors: errors.slice(0, 20) // Return first 20 errors
    };
  },
};
