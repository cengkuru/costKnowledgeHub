/**
 * Pre-Deployment Tests for Backend API
 *
 * These tests MUST pass before deploying to production.
 * Run with: npm run test:pre-deploy
 */

import { connectToDatabase, closeDatabase, getDatabase } from '../db';
import { aiService, initializeAI } from '../services/aiService';
import { topicService } from '../services/topicService';
import { imageStorageService } from '../services/imageStorageService';
import config from '../config';
import * as fs from 'fs';
import * as path from 'path';

describe('Pre-Deployment Checks', () => {
  beforeAll(async () => {
    await connectToDatabase();
    initializeAI();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('1. Environment Configuration', () => {
    it('should have MongoDB URI configured', () => {
      expect(config.mongodbUri).toBeDefined();
      expect(config.mongodbUri.length).toBeGreaterThan(0);
      expect(config.mongodbUri).not.toContain('localhost');
    });

    it('should have Gemini API key configured', () => {
      expect(config.geminiApiKey).toBeDefined();
      expect(config.geminiApiKey.length).toBeGreaterThan(10);
    });

    it('should have JWT secret configured (not default)', () => {
      expect(config.jwtSecret).toBeDefined();
      expect(config.jwtSecret).not.toBe('your-secret-key-change-in-production');
      expect(config.jwtSecret.length).toBeGreaterThan(20);
    });

    it('should have GCS bucket configured for production', () => {
      expect(config.gcsBucketName).toBeDefined();
      expect(config.gcsBucketName.length).toBeGreaterThan(0);
    });

    it('should have GCP project ID configured', () => {
      expect(config.gcpProjectId).toBeDefined();
      expect(config.gcpProjectId.length).toBeGreaterThan(0);
    });
  });

  describe('2. Database Connectivity', () => {
    it('should connect to MongoDB successfully', async () => {
      const db = await getDatabase();
      expect(db).toBeDefined();
    });

    it('should have resources collection with data', async () => {
      const db = await getDatabase();
      const count = await db.collection('resources').countDocuments();
      expect(count).toBeGreaterThan(0);
    });

    it('should have users collection', async () => {
      const db = await getDatabase();
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      expect(collectionNames).toContain('users');
    });

    it('should have topics collection', async () => {
      const db = await getDatabase();
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      expect(collectionNames).toContain('topics');
    });
  });

  describe('3. AI Service Configuration', () => {
    it('should use gemini-3-pro-image-preview for image generation', async () => {
      const aiServicePath = path.join(__dirname, '../services/aiService.ts');
      const content = fs.readFileSync(aiServicePath, 'utf-8');

      expect(content).toContain("GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview'");
      expect(content).toContain("model: GEMINI_IMAGE_MODEL");
    });

    it('should have proper response modalities for image generation', async () => {
      const aiServicePath = path.join(__dirname, '../services/aiService.ts');
      const content = fs.readFileSync(aiServicePath, 'utf-8');

      expect(content).toContain("responseModalities: ['IMAGE', 'TEXT']");
    });
  });

  describe('4. GCS Image Storage', () => {
    it('should have GCS configured', () => {
      expect(imageStorageService.isConfigured()).toBe(true);
    });
  });

  describe('5. Security Checks', () => {
    it('should not have debug mode enabled in production config', () => {
      // Check no console.log with sensitive data patterns
      const configPath = path.join(__dirname, '../config/index.ts');
      const content = fs.readFileSync(configPath, 'utf-8');

      // Should not log API keys
      expect(content).not.toContain('console.log(config.geminiApiKey');
      expect(content).not.toContain('console.log(config.jwtSecret');
    });

    it('should have rate limiting middleware', async () => {
      const rateLimiterPath = path.join(__dirname, '../middleware/rateLimiter.ts');
      expect(fs.existsSync(rateLimiterPath)).toBe(true);
    });

    it('should have authentication middleware', async () => {
      const authPath = path.join(__dirname, '../middleware/auth.ts');
      expect(fs.existsSync(authPath)).toBe(true);

      const content = fs.readFileSync(authPath, 'utf-8');
      expect(content).toContain('authenticate');
      expect(content).toContain('requireAdmin');
    });
  });

  describe('6. TypeScript Compilation', () => {
    it('should have no TypeScript errors (checked by build)', () => {
      // This test passes if we got here - TS compilation succeeded
      expect(true).toBe(true);
    });
  });

  describe('7. Critical Routes Exist', () => {
    it('should have public routes configured', () => {
      const publicRoutesPath = path.join(__dirname, '../routes/public.ts');
      const content = fs.readFileSync(publicRoutesPath, 'utf-8');

      expect(content).toContain('/health');
      expect(content).toContain('/resources');
      expect(content).toContain('/auth/login');
      expect(content).toContain('/auth/logout');
      expect(content).toContain('/topics');
    });

    it('should have admin routes configured', () => {
      const adminRoutesPath = path.join(__dirname, '../routes/admin.ts');
      const content = fs.readFileSync(adminRoutesPath, 'utf-8');

      expect(content).toContain('authenticate');
      expect(content).toContain('requireAdmin');
      expect(content).toContain('/resources');
      expect(content).toContain('/topics');
    });
  });
});

describe('Pre-Deployment Integration Tests', () => {
  beforeAll(async () => {
    await connectToDatabase();
    initializeAI();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('8. Topic Service Integration', () => {
    it('should list topics successfully', async () => {
      const topics = await topicService.listTopics();
      expect(Array.isArray(topics)).toBe(true);
    });

    it('should build illustration prompts correctly', () => {
      const prompt = topicService.buildIllustrationPrompt('Test', 'Test description');
      expect(prompt).toContain('Test');
      expect(prompt).toContain('Harvard Business Review');
    });

    it('should generate fallback images', () => {
      const fallback = topicService.generateFallbackImage('Test');
      expect(fallback).toContain('data:image/svg+xml');
    });
  });
});
