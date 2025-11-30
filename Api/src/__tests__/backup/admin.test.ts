import { adminService } from '../services/adminService';
import { getDatabase, connectToDatabase, closeDatabase } from '../db';
import { COLLECTION_NAME, ContentStatus, Resource } from '../models/Resource';
import { CATEGORIES_COLLECTION_NAME, Category } from '../models/Category';
import { ObjectId } from 'mongodb';

describe('Admin Service Tests', () => {
  let testUserId: string;
  const uniqueId = Date.now();

  beforeAll(async () => {
    await connectToDatabase();
    testUserId = new ObjectId().toHexString();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Category Operations', () => {
    it('should create a category', async () => {
      const result = await adminService.createCategory(`Test Category ${uniqueId}-1`, 'A test category');

      expect(result).toBeDefined();
      expect(result.description).toBe('A test category');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.order).toBeGreaterThanOrEqual(0);
    });

    it('should list categories', async () => {
      const categories = await adminService.listCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should update a category', async () => {
      const created = await adminService.createCategory(`Cat Update ${uniqueId}-2`, 'Original');
      const catId = created._id?.toHexString() || '';

      const updated = await adminService.updateCategory(catId, `Cat Update ${uniqueId}-2 Updated`, 'Updated description');

      expect(updated.description).toBe('Updated description');
    });

    it('should throw error on invalid category ID format', async () => {
      await expect(adminService.updateCategory('invalid-id', 'New Name')).rejects.toThrow(
        'Invalid category ID format'
      );
    });

    it('should throw error on non-existent category', async () => {
      const fakeId = new ObjectId().toHexString();
      await expect(adminService.updateCategory(fakeId, 'New Name')).rejects.toThrow(
        'Category not found'
      );
    });

    it('should not delete category with resources', async () => {
      const catForDeletion = await adminService.createCategory(
        `Cat For Deletion ${uniqueId}-3`,
        'Testing deletion'
      );
      const catId = catForDeletion._id?.toHexString() || '';

      const resourceData = {
        title: 'Test Resource for Deletion',
        description: 'Test Description',
        url: 'https://example.com/delete',
        category: catId,
        resourceType: 'guidance',
        tags: [],
        topics: [],
        regions: [],
        language: 'en',
      };

      await adminService.createResource(resourceData, testUserId);

      await expect(adminService.deleteCategory(catId)).rejects.toThrow(
        /Cannot delete category with \d+ resource\(s\)/
      );
    });
  });

  describe('Resource CRUD Operations', () => {
    let testCategoryId: string;
    let testResourceId: string;

    beforeAll(async () => {
      const category = await adminService.createCategory(
        `Resource Test Cat ${uniqueId}-4`,
        'For testing resources'
      );
      testCategoryId = category._id?.toHexString() || '';
    });

    it('should create a resource with pending_review status', async () => {
      const resourceData = {
        title: 'Test Guidance Document',
        description: 'A comprehensive test resource',
        url: 'https://example.com/test',
        category: testCategoryId,
        resourceType: 'guidance',
        tags: ['test', 'guidance'],
        topics: ['cost', 'procurement'],
        regions: ['Global'],
        language: 'en',
      };

      const resource = await adminService.createResource(resourceData, testUserId);

      expect(resource).toBeDefined();
      expect(resource.title).toBe('Test Guidance Document');
      expect(resource.status).toBe(ContentStatus.PENDING_REVIEW);
      expect(resource.source).toBe('manual');
      expect(resource.clicks).toBe(0);
      expect(resource.statusHistory).toHaveLength(1);
      expect(resource.statusHistory?.[0].status).toBe(ContentStatus.PENDING_REVIEW);

      testResourceId = resource._id?.toHexString() || '';
    });

    it('should list resources with pagination', async () => {
      const result = await adminService.listResources({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter resources by status', async () => {
      const result = await adminService.listResources({
        status: ContentStatus.PENDING_REVIEW,
      });

      expect(result.data).toBeDefined();
      result.data.forEach((resource) => {
        expect(resource.status).toBe(ContentStatus.PENDING_REVIEW);
      });
    });

    it('should filter resources by category', async () => {
      const result = await adminService.listResources({ category: testCategoryId });

      expect(result.data).toBeDefined();
      result.data.forEach((resource) => {
        expect(resource.category.toHexString()).toBe(testCategoryId);
      });
    });

    it('should search resources by title', async () => {
      const result = await adminService.listResources({ q: 'Guidance' });

      expect(result.data).toBeDefined();
    });

    it('should get a single resource by ID', async () => {
      const resource = await adminService.getResource(testResourceId);

      expect(resource).toBeDefined();
      expect(resource.title).toBe('Test Guidance Document');
      expect(resource._id?.toHexString()).toBe(testResourceId);
    });

    it('should throw error for invalid resource ID format', async () => {
      await expect(adminService.getResource('invalid-id')).rejects.toThrow(
        'Invalid resource ID format'
      );
    });

    it('should throw error for non-existent resource', async () => {
      const fakeId = new ObjectId().toHexString();
      await expect(adminService.getResource(fakeId)).rejects.toThrow('Resource not found');
    });

    it('should update a resource', async () => {
      const updates = {
        title: 'Updated Test Guidance',
        description: 'Updated description',
      };

      const resource = await adminService.updateResource(testResourceId, updates, testUserId);

      expect(resource.title).toBe('Updated Test Guidance');
      expect(resource.description).toBe('Updated description');
    });

    it('should prevent status changes via update endpoint', async () => {
      const updates = {
        title: 'Another Update',
        status: ContentStatus.PUBLISHED,
      };

      await expect(
        adminService.updateResource(testResourceId, updates, testUserId)
      ).rejects.toThrow('Use /status endpoint to change resource status');
    });

    it('should delete resource (soft delete to archived)', async () => {
      const resourceData = {
        title: 'Resource to Delete',
        description: 'This will be deleted',
        url: 'https://example.com/delete',
        category: testCategoryId,
        resourceType: 'guidance',
        tags: [],
        topics: [],
        regions: [],
        language: 'en',
      };

      const resource = await adminService.createResource(resourceData, testUserId);
      const deleteId = resource._id?.toHexString() || '';

      await adminService.deleteResource(deleteId, testUserId);

      const deletedResource = await adminService.getResource(deleteId);
      expect(deletedResource.status).toBe(ContentStatus.ARCHIVED);
      expect(deletedResource.archivedAt).toBeDefined();
    });
  });

  describe('Status Transitions', () => {
    let testCategoryId: string;
    let resourceForStatusTest: Resource;

    beforeAll(async () => {
      const category = await adminService.createCategory(
        `Status Test Cat ${uniqueId}-5`,
        'For testing status transitions'
      );
      testCategoryId = category._id?.toHexString() || '';

      const resourceData = {
        title: 'Resource for Status Testing',
        description: 'Testing status transitions',
        url: 'https://example.com/status',
        category: testCategoryId,
        resourceType: 'guidance',
        tags: [],
        topics: [],
        regions: [],
        language: 'en',
      };

      resourceForStatusTest = await adminService.createResource(resourceData, testUserId);
    });

    it('should transition from PENDING_REVIEW to APPROVED', async () => {
      const id = resourceForStatusTest._id?.toHexString() || '';
      const updated = await adminService.updateStatus(
        id,
        ContentStatus.APPROVED,
        testUserId,
        'Reviewed and approved'
      );

      expect(updated.status).toBe(ContentStatus.APPROVED);
      expect(updated.statusHistory?.length).toBe(2);
    });

    it('should transition from APPROVED to PUBLISHED', async () => {
      const id = resourceForStatusTest._id?.toHexString() || '';
      const updated = await adminService.updateStatus(
        id,
        ContentStatus.PUBLISHED,
        testUserId,
        'Publishing resource'
      );

      expect(updated.status).toBe(ContentStatus.PUBLISHED);
      expect(updated.publishedAt).toBeDefined();
    });

    it('should transition from PUBLISHED to ARCHIVED', async () => {
      const id = resourceForStatusTest._id?.toHexString() || '';
      const updated = await adminService.updateStatus(
        id,
        ContentStatus.ARCHIVED,
        testUserId,
        'No longer relevant'
      );

      expect(updated.status).toBe(ContentStatus.ARCHIVED);
      expect(updated.archivedAt).toBeDefined();
    });

    it('should reject invalid status transition', async () => {
      const id = resourceForStatusTest._id?.toHexString() || '';
      await expect(
        adminService.updateStatus(id, ContentStatus.APPROVED, testUserId)
      ).rejects.toThrow(/Cannot transition from/);
    });

    it('should reject invalid status', async () => {
      const id = resourceForStatusTest._id?.toHexString() || '';
      await expect(
        adminService.updateStatus(id, 'invalid_status' as any, testUserId)
      ).rejects.toThrow('Invalid status');
    });
  });

  describe('Pagination and Sorting', () => {
    let testCategoryId: string;

    beforeAll(async () => {
      const category = await adminService.createCategory(
        `Pagination Test Cat ${uniqueId}-6`,
        'For testing pagination'
      );
      testCategoryId = category._id?.toHexString() || '';

      for (let i = 0; i < 5; i++) {
        const resourceData = {
          title: `Pagination Test Resource ${i} ${uniqueId}`,
          description: `Test resource ${i}`,
          url: `https://example.com/pagination/${i}`,
          category: testCategoryId,
          resourceType: 'guidance',
          tags: [],
          topics: [],
          regions: [],
          language: 'en',
        };

        await adminService.createResource(resourceData, testUserId);
      }
    });

    it('should paginate resources correctly', async () => {
      const page1 = await adminService.listResources({ page: 1, limit: 2 });
      const page2 = await adminService.listResources({ page: 2, limit: 2 });

      expect(page1.pagination.page).toBe(1);
      expect(page2.pagination.page).toBe(2);
    });

    it('should enforce maximum limit of 100', async () => {
      const result = await adminService.listResources({ limit: 500 });
      expect(result.pagination.limit).toBeLessThanOrEqual(100);
    });

    it('should sort resources', async () => {
      const descending = await adminService.listResources({
        sort: 'createdAt',
        order: 'desc',
      });
      const ascending = await adminService.listResources({
        sort: 'createdAt',
        order: 'asc',
      });

      expect(
        descending.data[0].createdAt?.getTime() >=
          descending.data[1].createdAt?.getTime() || 0
      ).toBe(true);
    });
  });

  describe('Validation and Error Handling', () => {
    let testCategoryId: string;

    beforeAll(async () => {
      const category = await adminService.createCategory(
        `Validation Test Cat ${uniqueId}-7`,
        'For testing validation'
      );
      testCategoryId = category._id?.toHexString() || '';
    });

    it('should reject resource with missing required fields', async () => {
      const invalidData = {
        title: 'Missing URL',
        description: 'This resource is missing a URL',
        category: testCategoryId,
        resourceType: 'guidance',
        tags: [],
        topics: [],
        regions: [],
        language: 'en',
      };

      await expect(adminService.createResource(invalidData, testUserId)).rejects.toThrow();
    });

    it('should reject category with empty name', async () => {
      await expect(adminService.createCategory('', 'Empty name')).rejects.toThrow(
        'Category name is required'
      );
    });

    it('should reject category name exceeding 100 characters', async () => {
      const longName = 'a'.repeat(101);
      await expect(adminService.createCategory(longName)).rejects.toThrow(
        'Category name must be 100 characters or less'
      );
    });

    it('should reject invalid category ID in resource creation', async () => {
      const resourceData = {
        title: 'Invalid Category Resource',
        description: 'Testing invalid category',
        url: 'https://example.com/invalid',
        category: 'invalid-id',
        resourceType: 'guidance',
        tags: [],
        topics: [],
        regions: [],
        language: 'en',
      };

      await expect(adminService.createResource(resourceData, testUserId)).rejects.toThrow(
        'Invalid category ID format'
      );
    });

    it('should reject non-existent category ID', async () => {
      const fakeId = new ObjectId().toHexString();
      const resourceData = {
        title: 'Non-existent Category Resource',
        description: 'Testing non-existent category',
        url: 'https://example.com/nonexistent',
        category: fakeId,
        resourceType: 'guidance',
        tags: [],
        topics: [],
        regions: [],
        language: 'en',
      };

      await expect(adminService.createResource(resourceData, testUserId)).rejects.toThrow(
        'Category not found'
      );
    });

    it('should reject invalid status for filtering', async () => {
      await expect(
        adminService.listResources({ status: 'invalid_status' })
      ).rejects.toThrow('Invalid status');
    });

    it('should reject invalid category ID for filtering', async () => {
      await expect(
        adminService.listResources({ category: 'invalid-id' })
      ).rejects.toThrow('Invalid category ID');
    });
  });
});
