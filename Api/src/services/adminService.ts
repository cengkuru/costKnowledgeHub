import { getDatabase } from '../db';
import { Resource, ResourceInputSchema, ContentStatus, StatusChange, COLLECTION_NAME } from '../models/Resource';
import { Category, CATEGORIES_COLLECTION_NAME } from '../models/Category';
import { ApiError } from '../middleware/errorHandler';
import { ObjectId } from 'mongodb';

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
}

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
      // Filter by topic name (topics array contains topic names)
      filter.topics = query.topic;
    }

    if (query.q) {
      // Search in title and description
      filter.$or = [
        { title: { $regex: query.q, $options: 'i' } },
        { description: { $regex: query.q, $options: 'i' } },
      ];
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

    // Convert category string to ObjectId if updating it
    if (data.category) {
      try {
        data.category = new ObjectId(data.category);
      } catch {
        throw new ApiError(400, 'Invalid category ID format');
      }

      // Verify category exists
      const categoryCollection = db.collection<Category>(CATEGORIES_COLLECTION_NAME);
      const category = await categoryCollection.findOne({ _id: data.category });
      if (!category) {
        throw new ApiError(400, 'Category not found');
      }
    }

    const userObjectId = new ObjectId(userId);
    const updates: any = {
      ...data,
      updatedAt: new Date(),
      updatedBy: userObjectId,
    };

    if (data.category) {
      updates.category = new ObjectId(data.category);
    }

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
};
