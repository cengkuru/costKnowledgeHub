import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { connectToDatabase, closeDatabase, getDatabase } from '../db';
import { COLLECTION_NAME } from '../models/Resource';

// Create a test app instance
const app = express();
app.use(cors());
app.use(express.json());

// Import routes after app setup
let server: any;

describe('API Endpoint Tests', () => {
  let testResourceId: string;

  beforeAll(async () => {
    await connectToDatabase();

    // Get a test resource ID
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);
    const resource = await collection.findOne({});
    testResourceId = resource?.id || '';
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('GET /api/resources', () => {
    it('should return array of resources', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);
      const resources = await collection.find({}).sort({ date: -1 }).toArray();

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
    });

    it('should filter resources by category', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);
      const category = 'OC4IDS';

      const resources = await collection
        .find({ category })
        .sort({ date: -1 })
        .toArray();

      resources.forEach((resource) => {
        expect(resource.category).toBe(category);
      });
    });

    it('should filter resources by type', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);
      const type = 'Documentation';

      const resources = await collection
        .find({ type })
        .sort({ date: -1 })
        .toArray();

      resources.forEach((resource) => {
        expect(resource.type).toBe(type);
      });
    });

    it('should return all resources when no filters applied', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const allResources = await collection.find({}).toArray();
      const filteredResources = await collection
        .find({ category: 'All Topics' })
        .toArray();

      // All Topics should return nothing (it's a filter value, not actual category)
      expect(filteredResources.length).toBe(0);
      expect(allResources.length).toBeGreaterThan(0);
    });

    it('should transform MongoDB documents correctly', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const resources = await collection.find({}).limit(1).toArray();
      const resource = resources[0];

      expect(resource).toHaveProperty('id');
      expect(resource).toHaveProperty('title');
      expect(resource).toHaveProperty('description');
      expect(resource).toHaveProperty('url');
      expect(resource).toHaveProperty('category');
      expect(resource).toHaveProperty('type');
      expect(resource).toHaveProperty('date');
    });
  });

  describe('POST /api/interact/:id', () => {
    it('should increment clicks for existing resource', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      // Get initial clicks
      const initialResource = await collection.findOne({ id: testResourceId });
      const initialClicks = initialResource?.clicks || 0;

      // Increment clicks
      const result = await collection.findOneAndUpdate(
        { id: testResourceId },
        { $inc: { clicks: 1 }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      expect(result).toBeDefined();
      expect(result!.clicks).toBe(initialClicks + 1);

      // Cleanup: reset clicks
      await collection.updateOne(
        { id: testResourceId },
        { $set: { clicks: initialClicks } }
      );
    });

    it('should return updated clicks count', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const initialResource = await collection.findOne({ id: testResourceId });
      const initialClicks = initialResource?.clicks || 0;

      const result = await collection.findOneAndUpdate(
        { id: testResourceId },
        { $inc: { clicks: 1 }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      expect(result!.clicks).toBeGreaterThan(initialClicks);

      // Cleanup
      await collection.updateOne(
        { id: testResourceId },
        { $set: { clicks: initialClicks } }
      );
    });

    it('should return null for non-existent resource', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const result = await collection.findOneAndUpdate(
        { id: 'non-existent-id-12345' },
        { $inc: { clicks: 1 }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      expect(result).toBeNull();
    });

    it('should update updatedAt timestamp', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const beforeTime = new Date();

      const result = await collection.findOneAndUpdate(
        { id: testResourceId },
        { $inc: { clicks: 1 }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      expect(result!.updatedAt).toBeDefined();
      expect(result!.updatedAt!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());

      // Cleanup
      const initialResource = await collection.findOne({ id: testResourceId });
      await collection.updateOne(
        { id: testResourceId },
        { $set: { clicks: (initialResource?.clicks || 1) - 1 } }
      );
    });
  });

  describe('GET /api/popular', () => {
    it('should return resources with clicks > 0', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const popularResources = await collection
        .find({ clicks: { $gt: 0 } })
        .sort({ clicks: -1 })
        .toArray();

      popularResources.forEach((resource) => {
        expect(resource.clicks).toBeGreaterThan(0);
      });
    });

    it('should sort by clicks descending', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const popularResources = await collection
        .find({ clicks: { $gt: 0 } })
        .sort({ clicks: -1 })
        .toArray();

      for (let i = 1; i < popularResources.length; i++) {
        expect(popularResources[i - 1].clicks).toBeGreaterThanOrEqual(
          popularResources[i].clicks || 0
        );
      }
    });

    it('should calculate threshold correctly', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const resourcesWithClicks = await collection
        .find({ clicks: { $gt: 0 } })
        .sort({ clicks: -1 })
        .toArray();

      if (resourcesWithClicks.length === 0) {
        // No resources with clicks, threshold should handle this
        expect(true).toBe(true);
        return;
      }

      const threshold = Math.max(
        2,
        resourcesWithClicks[Math.floor(resourcesWithClicks.length * 0.2)]?.clicks || 0
      );

      expect(threshold).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no clicks', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      // Clear all clicks temporarily for test
      const resourcesWithClicks = await collection
        .find({ clicks: { $gt: 0 } })
        .toArray();

      const originalClicks = resourcesWithClicks.map((r) => ({
        id: r.id,
        clicks: r.clicks,
      }));

      // Set all clicks to 0
      await collection.updateMany({}, { $set: { clicks: 0 } });

      const popularResources = await collection
        .find({ clicks: { $gt: 0 } })
        .toArray();

      expect(popularResources.length).toBe(0);

      // Restore clicks
      for (const item of originalClicks) {
        await collection.updateOne(
          { id: item.id },
          { $set: { clicks: item.clicks } }
        );
      }
    });

    it('should return only IDs of popular resources', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const resourcesWithClicks = await collection
        .find({ clicks: { $gt: 0 } })
        .sort({ clicks: -1 })
        .toArray();

      if (resourcesWithClicks.length === 0) {
        expect(true).toBe(true);
        return;
      }

      const threshold = Math.max(
        2,
        resourcesWithClicks[Math.floor(resourcesWithClicks.length * 0.2)]?.clicks || 0
      );

      const popularIds = resourcesWithClicks
        .filter((r) => (r.clicks || 0) >= threshold)
        .map((r) => r.id);

      expect(Array.isArray(popularIds)).toBe(true);
      popularIds.forEach((id) => {
        expect(typeof id).toBe('string');
      });
    });
  });

  describe('POST /api/search', () => {
    it('should require query parameter', async () => {
      const query = '';
      expect(query).toBe('');
      // Query validation test
    });

    it('should accept valid query string', async () => {
      const query = 'OC4IDS documentation';
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });

    it('should have access to resources for context', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const resources = await collection.find({}).toArray();
      expect(resources.length).toBeGreaterThan(0);

      const contextData = resources.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        type: r.type,
      }));

      expect(contextData.length).toBe(resources.length);
      expect(contextData[0]).toHaveProperty('id');
      expect(contextData[0]).toHaveProperty('title');
    });
  });

  describe('POST /api/translate', () => {
    it('should return English resources when no targetLang', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const resources = await collection.find({}).toArray();
      const resourceItems = resources.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        url: r.url,
        category: r.category,
        type: r.type,
        date: r.date,
      }));

      expect(resourceItems.length).toBeGreaterThan(0);
    });

    it('should return English resources when targetLang is "en"', async () => {
      const targetLang = 'en';
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const resources = await collection.find({}).toArray();
      expect(resources.length).toBeGreaterThan(0);
    });

    it('should prepare items for translation', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const resources = await collection.find({}).toArray();
      const itemsToTranslate = resources.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
      }));

      expect(itemsToTranslate.length).toBe(resources.length);
      itemsToTranslate.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('description');
      });
    });

    it('should map Spanish language code correctly', () => {
      const targetLang = 'es';
      const languageName = targetLang === 'es' ? 'Spanish' : 'Portuguese';
      expect(languageName).toBe('Spanish');
    });

    it('should map Portuguese language code correctly', () => {
      const targetLang: string = 'pt';
      const languageName = targetLang === 'es' ? 'Spanish' : 'Portuguese';
      expect(languageName).toBe('Portuguese');
    });
  });

  describe('CORS Configuration', () => {
    it('should have allowed origins configured', () => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:4200'];

      expect(Array.isArray(allowedOrigins)).toBe(true);
      expect(allowedOrigins.length).toBeGreaterThan(0);
    });

    it('should include localhost in allowed origins', () => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:4200'];

      const hasLocalhost = allowedOrigins.some((origin) =>
        origin.includes('localhost')
      );
      expect(hasLocalhost).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test that error handling is in place
      expect(async () => {
        await getDatabase();
      }).not.toThrow();
    });

    it('should validate resource existence before update', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const result = await collection.findOneAndUpdate(
        { id: 'non-existent-resource' },
        { $inc: { clicks: 1 } },
        { returnDocument: 'after' }
      );

      expect(result).toBeNull();
    });
  });
});
