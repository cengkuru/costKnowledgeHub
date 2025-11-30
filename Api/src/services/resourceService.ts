import { ObjectId } from 'mongodb';
import { getDatabase } from '../db';
import { Resource, COLLECTION_NAME } from '../models/Resource';
import { ApiError } from '../middleware/errorHandler';
import { topicService } from './topicService';
import { mapResourceToTopic } from '../utils/topicCategory';

// Simple response type for API compatibility
interface ResourceItem {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  type: string;
  date: string;
  coverImage?: string;
  tags?: string[];
}

// Map workstreams/tags to frontend category names (shared helper)
function mapToFrontendCategory(resource: any, activeTopics?: Set<string>): string {
  return mapResourceToTopic(resource, { activeTopics });
}

// Cache for active topic names (refreshed periodically)
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

export const resourceService = {
  /**
   * Get all resources with optional filtering
   * Only returns resources from active topics
   */
  async getResources(filters: {
    category?: string;
    type?: string;
  }): Promise<ResourceItem[]> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // Get active topic names
    const activeTopicNames = await getActiveTopicNames();

    const filter: any = { status: 'published' };

    // Note: Category filtering is done post-fetch since we need to map workstreams to categories
    // Type filter needs to check both 'resourceType' and 'type' fields
    if (filters.type && filters.type !== 'All Types') {
      filter.$or = [{ resourceType: filters.type }, { type: filters.type }];
    }

    const resources = await collection.find(filter).sort({ createdAt: -1 }).toArray();

    let mapped = resources.map((r: any) => ({
      id: r._id.toString(),
      title: r.title || '',
      description: r.description || '',
      url: r.url || '',
      category: mapToFrontendCategory(r, activeTopicNames),
      type: r.resourceType || r.type || '',
      date: r.createdAt?.toISOString() || new Date().toISOString(),
      coverImage: r.coverImage || '',
      tags: r.tags || [],
    }));

    // Filter to only include resources from active topics
    mapped = mapped.filter(r => activeTopicNames.has(r.category));

    // Apply category filter post-mapping
    if (filters.category && filters.category !== 'All Topics') {
      mapped = mapped.filter(r => r.category === filters.category);
    }

    return mapped;
  },

  /**
   * Get a single resource by ID
   */
  async getResourceById(id: string): Promise<ResourceItem | null> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);
    const activeTopicNames = await getActiveTopicNames();

    let resource;
    try {
      resource = await collection.findOne({ _id: new ObjectId(id) });
    } catch {
      resource = await collection.findOne({ slug: id });
    }

    if (!resource) {
      return null;
    }

    return {
      id: (resource as any)._id.toString(),
      title: (resource as any).title || '',
      description: (resource as any).description || '',
      url: (resource as any).url || '',
      category: mapToFrontendCategory(resource, activeTopicNames),
      type: (resource as any).resourceType || (resource as any).type || '',
      date: (resource as any).createdAt?.toISOString() || new Date().toISOString(),
      coverImage: (resource as any).coverImage || '',
      tags: (resource as any).tags || [],
    };
  },

  /**
   * Increment clicks for a resource
   */
  async incrementClicks(id: string): Promise<{ success: boolean; clicks: number }> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    let result;
    try {
      result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $inc: { clicks: 1 }, $set: { updatedAt: new Date(), lastClickedAt: new Date() } },
        { returnDocument: 'after' }
      );
    } catch {
      result = await collection.findOneAndUpdate(
        { slug: id },
        { $inc: { clicks: 1 }, $set: { updatedAt: new Date(), lastClickedAt: new Date() } },
        { returnDocument: 'after' }
      );
    }

    if (!result) {
      throw new ApiError(404, 'Resource not found');
    }

    return { success: true, clicks: (result as any).clicks || 0 };
  },

  /**
   * Get featured assurance/independent review resources
   * Only returns resources from active topics
   */
  async getFeaturedResources(): Promise<ResourceItem[]> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // Get active topic names
    const activeTopicNames = await getActiveTopicNames();

    const resources = await collection
      .find({
        status: 'published',
        $or: [
          { featured: true },
          { workstreams: 'assurance' },
          { tags: { $in: ['independent review', 'assurance'] } }
        ]
      })
      .sort({ priority: 1, createdAt: -1 })
      .limit(12) // Fetch more to account for filtering
      .toArray();

    const mapped = resources.map((r: any) => ({
      id: r._id.toString(),
      title: r.title || '',
      description: r.description || '',
      url: r.url || '',
      category: mapToFrontendCategory(r, activeTopicNames),
      type: r.resourceType || r.type || '',
      date: r.createdAt?.toISOString() || new Date().toISOString(),
      featured: r.featured || false,
      tags: r.tags || [],
    }));

    // Filter to only include resources from active topics and limit to 6
    return mapped.filter(r => activeTopicNames.has(r.category)).slice(0, 6);
  },

  /**
   * Get popular resources (with high click counts)
   * Only returns resources from active topics
   */
  async getPopularResources(): Promise<string[]> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // Get active topic names
    const activeTopicNames = await getActiveTopicNames();

    const resourcesWithClicks = await collection
      .find({ clicks: { $gt: 0 }, status: 'published' })
      .sort({ clicks: -1 })
      .limit(40) // Fetch more to account for filtering
      .toArray();

    if (resourcesWithClicks.length === 0) {
      return [];
    }

    // Filter to only include resources from active topics
    const filtered = resourcesWithClicks.filter((r: any) => {
      const category = mapToFrontendCategory(r, activeTopicNames);
      return activeTopicNames.has(category);
    });

    return filtered.slice(0, 20).map((r: any) => r._id.toString());
  },

  /**
   * Create a new resource (admin only)
   */
  async createResource(resourceData: any): Promise<any> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const newResource = {
      ...resourceData,
      clicks: 0,
      aiCitations: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const category = mapToFrontendCategory(newResource);
    newResource.category = category;
    newResource.topics = [category];

    const result = await collection.insertOne(newResource);
    return { ...newResource, _id: result.insertedId };
  },

  /**
   * Update a resource (admin only)
   */
  async updateResource(id: string, updates: any): Promise<any> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      throw new ApiError(404, 'Resource not found');
    }

    const merged = { ...existing, ...updates };
    const category = mapToFrontendCategory(merged);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, category, topics: [category], updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    return result;
  },

  /**
   * Delete a resource (admin only)
   */
  async deleteResource(id: string): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      throw new ApiError(404, 'Resource not found');
    }
  },

  /**
   * Get all resources for AI context (minimal fields)
   * Only returns resources from active topics
   */
  async getResourcesForAI(): Promise<any[]> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // Get active topic names
    const activeTopicNames = await getActiveTopicNames();

    const resources = await collection.find({ status: 'published' }).toArray();

    const mapped = resources.map((r: any) => ({
      id: r._id.toString(),
      title: r.title || '',
      description: r.description || '',
      category: mapToFrontendCategory(r, activeTopicNames),
      type: r.resourceType || r.type || '',
    }));

    // Filter to only include resources from active topics
    return mapped.filter(r => activeTopicNames.has(r.category));
  },

  /**
   * Invalidate the active topics cache (call after topic status changes)
   */
  invalidateTopicCache(): void {
    activeTopicNamesCache = null;
    cacheLastUpdated = 0;
  },
};
