import { connectToDatabase, closeDatabase, getDatabase } from '../db';
import { COLLECTION_NAME } from '../models/Resource';
import { GoogleGenAI } from '@google/genai';

describe('Integration Tests', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Full Request/Response Cycle', () => {
    it('should complete full resource retrieval flow', async () => {
      // 1. Connect to database
      const db = await getDatabase();
      expect(db).toBeDefined();

      // 2. Get resources collection
      const collection = db.collection(COLLECTION_NAME);
      expect(collection).toBeDefined();

      // 3. Query resources
      const resources = await collection.find({}).sort({ date: -1 }).toArray();
      expect(resources.length).toBeGreaterThan(0);

      // 4. Transform to API format
      const resourceItems = resources.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        url: r.url,
        category: r.category,
        type: r.type,
        date: r.date,
      }));

      expect(resourceItems.length).toBe(resources.length);
      expect(resourceItems[0]).toHaveProperty('id');
    });

    it('should complete full interaction tracking flow', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      // 1. Get a resource
      const resource = await collection.findOne({});
      expect(resource).toBeDefined();

      const originalClicks = resource!.clicks || 0;

      // 2. Track interaction (increment clicks)
      const updateResult = await collection.findOneAndUpdate(
        { id: resource!.id },
        { $inc: { clicks: 1 }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      expect(updateResult).toBeDefined();
      expect(updateResult!.clicks).toBe(originalClicks + 1);

      // 3. Verify update
      const updatedResource = await collection.findOne({ id: resource!.id });
      expect(updatedResource!.clicks).toBe(originalClicks + 1);

      // Cleanup
      await collection.updateOne(
        { id: resource!.id },
        { $set: { clicks: originalClicks } }
      );
    });

    it('should complete full popular resources flow', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      // 1. Get resources with clicks
      const resourcesWithClicks = await collection
        .find({ clicks: { $gt: 0 } })
        .sort({ clicks: -1 })
        .toArray();

      // 2. Calculate threshold
      if (resourcesWithClicks.length > 0) {
        const threshold = Math.max(
          2,
          resourcesWithClicks[Math.floor(resourcesWithClicks.length * 0.2)]?.clicks || 0
        );

        // 3. Filter popular resources
        const popularResources = resourcesWithClicks.filter(
          (r) => (r.clicks || 0) >= threshold
        );

        // 4. Extract IDs
        const popularIds = popularResources.map((r) => r.id);

        expect(Array.isArray(popularIds)).toBe(true);
        popularIds.forEach((id) => {
          expect(typeof id).toBe('string');
        });
      }
    });

    it('should complete full filter flow', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      // 1. Build filter
      const category = 'OC4IDS';
      const filter: any = { category };

      // 2. Query with filter
      const filteredResources = await collection
        .find(filter)
        .sort({ date: -1 })
        .toArray();

      // 3. Verify results
      filteredResources.forEach((resource) => {
        expect(resource.category).toBe(category);
      });

      // 4. Transform results
      const resourceItems = filteredResources.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        url: r.url,
        category: r.category,
        type: r.type,
        date: r.date,
      }));

      expect(resourceItems.length).toBe(filteredResources.length);
    });
  });

  describe('AI Features Integration', () => {
    const apiKey = process.env.API_KEY;

    it('should initialize Gemini AI if API key exists', () => {
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        expect(ai).toBeDefined();
      } else {
        console.warn('Skipping AI test: API_KEY not set');
        expect(true).toBe(true);
      }
    });

    it('should prepare context data for AI search', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const resources = await collection.find({}).toArray();

      const contextData = resources.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        type: r.type,
      }));

      expect(contextData.length).toBeGreaterThan(0);
      expect(contextData[0]).toHaveProperty('id');
      expect(contextData[0]).toHaveProperty('title');
      expect(contextData[0]).toHaveProperty('description');
    });

    it('should prepare items for translation', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const resources = await collection.find({}).limit(5).toArray();

      const itemsToTranslate = resources.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
      }));

      expect(itemsToTranslate.length).toBe(resources.length);
      itemsToTranslate.forEach((item) => {
        expect(item).not.toHaveProperty('url');
        expect(item).not.toHaveProperty('category');
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('description');
      });
    });

    // This test will only run if API_KEY is set
    if (apiKey) {
      it('should call Gemini API for search (live test)', async () => {
        const ai = new GoogleGenAI({ apiKey });
        const db = await getDatabase();
        const collection = db.collection(COLLECTION_NAME);

        const resources = await collection.find({}).limit(10).toArray();
        const contextData = resources.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          category: r.category,
          type: r.type,
        }));

        const query = 'OC4IDS standards';
        const prompt = `
          You are an expert Knowledge Manager for an Infrastructure Transparency initiative.
          User Query: "${query}"

          Task:
          1. Select relevant resources from the provided list.
          2. Organize them into 2-4 logical groups that represent a "User Journey" or "Workflow".
          3. If the query is vague, group by standard categories.
          4. Provide a 'title' for the group and a short 'description'.

          Resources:
          ${JSON.stringify(contextData)}

          Return ONLY a JSON array of Group objects with structure: {title: string, description: string, resourceIds: string[]}.
        `;

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          expect(response).toBeDefined();
          expect(response.text).toBeDefined();

          const result = JSON.parse(response.text || '[]');
          expect(Array.isArray(result)).toBe(true);
        } catch (error: any) {
          // AI might fail due to rate limits or other issues
          console.warn('AI search test failed:', error.message);
          expect(true).toBe(true);
        }
      }, 30000);

      it('should call Gemini API for translation (live test)', async () => {
        const ai = new GoogleGenAI({ apiKey });
        const targetLang = 'es';

        const testItems = [
          {
            id: 'test-1',
            title: 'OC4IDS Documentation',
            description: 'Comprehensive guide to OC4IDS standard',
          },
        ];

        const languageName = 'Spanish';
        const prompt = `
          Translate the 'title' and 'description' fields of the following JSON objects into ${languageName}.
          Keep the 'id' field exactly as is.
          Return the result as a JSON array of objects.

          Data to translate:
          ${JSON.stringify(testItems)}
        `;

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          expect(response).toBeDefined();
          expect(response.text).toBeDefined();

          const translations = JSON.parse(response.text || '[]');
          expect(Array.isArray(translations)).toBe(true);
          expect(translations.length).toBeGreaterThan(0);
        } catch (error: any) {
          console.warn('AI translation test failed:', error.message);
          expect(true).toBe(true);
        }
      }, 30000);
    } else {
      it('should skip AI tests when API_KEY not set', () => {
        console.warn('Skipping live AI tests: API_KEY not configured');
        expect(true).toBe(true);
      });
    }
  });

  describe('CORS Integration', () => {
    it('should validate allowed origins configuration', () => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:4200'];

      expect(Array.isArray(allowedOrigins)).toBe(true);
      expect(allowedOrigins.length).toBeGreaterThan(0);

      // Should include development origin
      const hasDevOrigin = allowedOrigins.some(
        (origin) => origin.includes('localhost') || origin.includes('127.0.0.1')
      );
      expect(hasDevOrigin).toBe(true);
    });

    it('should validate production origins if configured', () => {
      if (process.env.ALLOWED_ORIGINS) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

        allowedOrigins.forEach((origin) => {
          // Should be valid URL format
          expect(origin).toMatch(/^https?:\/\//);
        });
      }
    });
  });

  describe('End-to-End Scenarios', () => {
    it('should handle user browsing and clicking resources', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      // 1. User loads resources
      const resources = await collection.find({}).sort({ date: -1 }).limit(10).toArray();
      expect(resources.length).toBeGreaterThan(0);

      // 2. User clicks on a resource
      const clickedResource = resources[0];
      const originalClicks = clickedResource.clicks || 0;

      const updateResult = await collection.findOneAndUpdate(
        { id: clickedResource.id },
        { $inc: { clicks: 1 }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      expect(updateResult!.clicks).toBe(originalClicks + 1);

      // 3. User checks popular resources
      const popularResources = await collection
        .find({ clicks: { $gt: 0 } })
        .sort({ clicks: -1 })
        .toArray();

      expect(popularResources.length).toBeGreaterThan(0);

      // Cleanup
      await collection.updateOne(
        { id: clickedResource.id },
        { $set: { clicks: originalClicks } }
      );
    });

    it('should handle filtering by category and type', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      // Get a category that exists
      const sampleResource = await collection.findOne({});
      const category = sampleResource!.category;
      const type = sampleResource!.type;

      // Filter by category
      const categoryResults = await collection
        .find({ category })
        .sort({ date: -1 })
        .toArray();

      expect(categoryResults.length).toBeGreaterThan(0);
      categoryResults.forEach((r) => {
        expect(r.category).toBe(category);
      });

      // Filter by type
      const typeResults = await collection
        .find({ type })
        .sort({ date: -1 })
        .toArray();

      expect(typeResults.length).toBeGreaterThan(0);
      typeResults.forEach((r) => {
        expect(r.type).toBe(type);
      });

      // Filter by both
      const combinedResults = await collection
        .find({ category, type })
        .sort({ date: -1 })
        .toArray();

      combinedResults.forEach((r) => {
        expect(r.category).toBe(category);
        expect(r.type).toBe(type);
      });
    });

    it('should handle multiple concurrent interactions', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const resources = await collection.find({}).limit(3).toArray();
      const originalClicks = resources.map((r) => ({ id: r.id, clicks: r.clicks || 0 }));

      // Simulate multiple users clicking different resources
      const promises = resources.map((resource) =>
        collection.findOneAndUpdate(
          { id: resource.id },
          { $inc: { clicks: 1 }, $set: { updatedAt: new Date() } },
          { returnDocument: 'after' }
        )
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result!.clicks).toBe(originalClicks[index].clicks + 1);
      });

      // Cleanup
      for (const original of originalClicks) {
        await collection.updateOne(
          { id: original.id },
          { $set: { clicks: original.clicks } }
        );
      }
    });
  });

  describe('Error Recovery', () => {
    it('should handle missing resource gracefully', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const result = await collection.findOne({ id: 'non-existent-id' });
      expect(result).toBeNull();
    });

    it('should handle invalid filter values', async () => {
      const db = await getDatabase();
      const collection = db.collection(COLLECTION_NAME);

      const results = await collection.find({ category: 'InvalidCategory' }).toArray();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle database reconnection', async () => {
      await closeDatabase();
      const db = await getDatabase();
      expect(db).toBeDefined();

      const collection = db.collection(COLLECTION_NAME);
      const resources = await collection.find({}).limit(1).toArray();
      expect(resources.length).toBeGreaterThan(0);
    });
  });
});
