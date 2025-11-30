import { connectToDatabase, getDatabase, closeDatabase } from '../db';
import { MongoClient } from 'mongodb';

describe('Database Connection Tests', () => {
  afterAll(async () => {
    await closeDatabase();
  });

  describe('connectToDatabase', () => {
    it('should connect to MongoDB successfully', async () => {
      const db = await connectToDatabase();
      expect(db).toBeDefined();
      expect(db.databaseName).toBe(process.env.DB_NAME || 'infrascope');
    });

    it('should return existing connection on subsequent calls', async () => {
      const db1 = await connectToDatabase();
      const db2 = await connectToDatabase();
      expect(db1).toBe(db2);
    });

    it('should validate MONGODB_URI configuration', () => {
      // Verify that MONGODB_URI is configured (required for all tests)
      expect(process.env.MONGODB_URI).toBeDefined();
      expect(process.env.MONGODB_URI).toContain('mongodb');
    });
  });

  describe('getDatabase', () => {
    it('should return database instance', async () => {
      const db = await getDatabase();
      expect(db).toBeDefined();
      expect(db.databaseName).toBe(process.env.DB_NAME || 'infrascope');
    });

    it('should connect if not already connected', async () => {
      await closeDatabase();
      const db = await getDatabase();
      expect(db).toBeDefined();
    });
  });

  describe('Database Collections', () => {
    it('should access resources collection', async () => {
      const db = await getDatabase();
      const collection = db.collection('resources');
      expect(collection).toBeDefined();
      expect(collection.collectionName).toBe('resources');
    });

    it('should retrieve resources from database', async () => {
      const db = await getDatabase();
      const collection = db.collection('resources');
      const resources = await collection.find({}).limit(5).toArray();

      expect(Array.isArray(resources)).toBe(true);
      // Should have at least some resources in dev database
      expect(resources.length).toBeGreaterThan(0);
    });

    it('should have valid resource structure', async () => {
      const db = await getDatabase();
      const collection = db.collection('resources');
      const resource = await collection.findOne({});

      expect(resource).toBeDefined();
      expect(resource).toHaveProperty('id');
      expect(resource).toHaveProperty('title');
      expect(resource).toHaveProperty('description');
      expect(resource).toHaveProperty('url');
      expect(resource).toHaveProperty('category');
      expect(resource).toHaveProperty('type');
      expect(resource).toHaveProperty('date');
    });
  });

  describe('Database Operations', () => {
    it('should increment clicks on resource', async () => {
      const db = await getDatabase();
      const collection = db.collection('resources');

      // Get a resource
      const resource = await collection.findOne({});
      expect(resource).toBeDefined();

      const originalClicks = resource!.clicks || 0;
      const resourceId = resource!.id;

      // Increment clicks
      await collection.updateOne(
        { id: resourceId },
        { $inc: { clicks: 1 }, $set: { updatedAt: new Date() } }
      );

      // Verify the increment
      const updated = await collection.findOne({ id: resourceId });
      expect(updated).toBeDefined();
      expect(updated!.clicks).toBeGreaterThan(originalClicks);

      // Cleanup: reset to original
      await collection.updateOne(
        { id: resourceId },
        { $set: { clicks: originalClicks } }
      );
    });

    it('should filter resources by category', async () => {
      const db = await getDatabase();
      const collection = db.collection('resources');

      const oc4idsResources = await collection
        .find({ category: 'OC4IDS' })
        .toArray();

      expect(Array.isArray(oc4idsResources)).toBe(true);
      oc4idsResources.forEach((resource) => {
        expect(resource.category).toBe('OC4IDS');
      });
    });

    it('should sort resources by date descending', async () => {
      const db = await getDatabase();
      const collection = db.collection('resources');

      const resources = await collection
        .find({})
        .sort({ date: -1 })
        .limit(5)
        .toArray();

      expect(resources.length).toBeGreaterThan(0);

      // Check sorting
      for (let i = 1; i < resources.length; i++) {
        expect(resources[i - 1].date >= resources[i].date).toBe(true);
      }
    });

    it('should find resources with clicks greater than zero', async () => {
      const db = await getDatabase();
      const collection = db.collection('resources');

      const popularResources = await collection
        .find({ clicks: { $gt: 0 } })
        .sort({ clicks: -1 })
        .toArray();

      expect(Array.isArray(popularResources)).toBe(true);
      popularResources.forEach((resource) => {
        expect(resource.clicks).toBeGreaterThan(0);
      });
    });
  });

  describe('closeDatabase', () => {
    it('should close database connection', async () => {
      await closeDatabase();
      // After close, getDatabase should reconnect
      const db = await getDatabase();
      expect(db).toBeDefined();
    });
  });
});
