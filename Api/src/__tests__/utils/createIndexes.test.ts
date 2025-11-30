import { MongoClient, Db } from 'mongodb';
import {
  createDatabaseIndexes,
  listResourceIndexes,
  listCategoryIndexes,
  dropAllIndexes
} from '../../utils/createIndexes';
import { COLLECTION_NAME } from '../../models/Resource';
import { CATEGORIES_COLLECTION_NAME } from '../../models/Category';

describe('Database Indexes', () => {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test_indexes_db');
  });

  afterAll(async () => {
    // Clean up test database
    await db.dropDatabase();
    await client.close();
  });

  beforeEach(async () => {
    // Clean collections before each test
    try {
      await db.collection(COLLECTION_NAME).drop();
    } catch (error) {
      // Collection might not exist
    }
    try {
      await db.collection(CATEGORIES_COLLECTION_NAME).drop();
    } catch (error) {
      // Collection might not exist
    }
  });

  describe('createDatabaseIndexes', () => {
    it('should create all resource indexes without error', async () => {
      await expect(createDatabaseIndexes(db)).resolves.not.toThrow();
    });

    it('should create status index on resources', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listResourceIndexes(db);

      const statusIndex = indexes.find(idx =>
        idx.key.status === 1 && Object.keys(idx.key).length === 1
      );
      expect(statusIndex).toBeDefined();
    });

    it('should create category index on resources', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listResourceIndexes(db);

      const categoryIndex = indexes.find(idx =>
        idx.key.category === 1 && Object.keys(idx.key).length === 1
      );
      expect(categoryIndex).toBeDefined();
    });

    it('should create resourceType index on resources', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listResourceIndexes(db);

      const typeIndex = indexes.find(idx =>
        idx.key.resourceType === 1 && Object.keys(idx.key).length === 1
      );
      expect(typeIndex).toBeDefined();
    });

    it('should create tags multikey index on resources', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listResourceIndexes(db);

      const tagsIndex = indexes.find(idx =>
        idx.key.tags === 1 && Object.keys(idx.key).length === 1
      );
      expect(tagsIndex).toBeDefined();
    });

    it('should create topics multikey index on resources', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listResourceIndexes(db);

      const topicsIndex = indexes.find(idx =>
        idx.key.topics === 1 && Object.keys(idx.key).length === 1
      );
      expect(topicsIndex).toBeDefined();
    });

    it('should create regions multikey index on resources', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listResourceIndexes(db);

      const regionsIndex = indexes.find(idx =>
        idx.key.regions === 1 && Object.keys(idx.key).length === 1
      );
      expect(regionsIndex).toBeDefined();
    });

    it('should create compound index for status, category, and createdAt', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listResourceIndexes(db);

      const compoundIndex = indexes.find(idx =>
        idx.key.status === 1 &&
        idx.key.category === 1 &&
        idx.key.createdAt === -1
      );
      expect(compoundIndex).toBeDefined();
      expect(compoundIndex?.name).toBe('status_category_created');
    });

    it('should create compound index for status, resourceType, and publishedAt', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listResourceIndexes(db);

      const compoundIndex = indexes.find(idx =>
        idx.key.status === 1 &&
        idx.key.resourceType === 1 &&
        idx.key.publishedAt === -1
      );
      expect(compoundIndex).toBeDefined();
      expect(compoundIndex?.name).toBe('status_type_published');
    });

    it('should create text search index on resources', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listResourceIndexes(db);

      const textIndex = indexes.find(idx =>
        idx.key._fts === 'text'
      );
      expect(textIndex).toBeDefined();
      expect(textIndex?.name).toBe('text_search');
    });

    it('should create unique URL index on resources', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listResourceIndexes(db);

      const urlIndex = indexes.find(idx =>
        idx.key.url === 1 && Object.keys(idx.key).length === 1
      );
      expect(urlIndex).toBeDefined();
      expect(urlIndex?.unique).toBe(true);
    });

    it('should create unique slug index on categories', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listCategoryIndexes(db);

      const slugIndex = indexes.find(idx =>
        idx.key.slug === 1 && Object.keys(idx.key).length === 1
      );
      expect(slugIndex).toBeDefined();
      expect(slugIndex?.unique).toBe(true);
    });

    it('should create parentCategory index on categories', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listCategoryIndexes(db);

      const parentIndex = indexes.find(idx =>
        idx.key.parentCategory === 1 && Object.keys(idx.key).length === 1
      );
      expect(parentIndex).toBeDefined();
      expect(parentIndex?.sparse).toBe(true);
    });

    it('should create order index on categories', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listCategoryIndexes(db);

      const orderIndex = indexes.find(idx =>
        idx.key.order === 1 && Object.keys(idx.key).length === 1
      );
      expect(orderIndex).toBeDefined();
    });

    it('should create compound parent-order index on categories', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listCategoryIndexes(db);

      const compoundIndex = indexes.find(idx =>
        idx.key.parentCategory === 1 &&
        idx.key.order === 1
      );
      expect(compoundIndex).toBeDefined();
      expect(compoundIndex?.name).toBe('parent_order');
    });

    it('should be idempotent (can run multiple times)', async () => {
      await createDatabaseIndexes(db);
      await expect(createDatabaseIndexes(db)).resolves.not.toThrow();
    });
  });

  describe('listResourceIndexes', () => {
    it('should return array of indexes', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listResourceIndexes(db);

      expect(Array.isArray(indexes)).toBe(true);
      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should include _id index by default', async () => {
      const indexes = await listResourceIndexes(db);
      const idIndex = indexes.find(idx => idx.key._id === 1);
      expect(idIndex).toBeDefined();
    });
  });

  describe('listCategoryIndexes', () => {
    it('should return array of indexes', async () => {
      await createDatabaseIndexes(db);
      const indexes = await listCategoryIndexes(db);

      expect(Array.isArray(indexes)).toBe(true);
      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should include _id index by default', async () => {
      const indexes = await listCategoryIndexes(db);
      const idIndex = indexes.find(idx => idx.key._id === 1);
      expect(idIndex).toBeDefined();
    });
  });

  describe('dropAllIndexes', () => {
    it('should drop all custom indexes', async () => {
      await createDatabaseIndexes(db);

      // Verify indexes exist
      let resourceIndexes = await listResourceIndexes(db);
      expect(resourceIndexes.length).toBeGreaterThan(1);

      // Drop indexes
      await dropAllIndexes(db);

      // Only _id index should remain
      resourceIndexes = await listResourceIndexes(db);
      expect(resourceIndexes.length).toBe(1);
      expect(resourceIndexes[0].key._id).toBe(1);
    });
  });
});
