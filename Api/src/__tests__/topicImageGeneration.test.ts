import jwt from 'jsonwebtoken';
import { connectToDatabase, closeDatabase, getDatabase } from '../db';
import { aiService, initializeAI } from '../services/aiService';
import { topicService } from '../services/topicService';
import { TOPICS_COLLECTION_NAME, Topic } from '../models/Topic';
import config from '../config';
import { ObjectId } from 'mongodb';

describe('Topic Image Generation Tests', () => {
  let testTopicId: string;
  let adminToken: string;
  const testUserId = new ObjectId();

  beforeAll(async () => {
    await connectToDatabase();
    initializeAI();

    // Create a test admin JWT token
    adminToken = jwt.sign(
      {
        userId: testUserId.toString(),
        email: 'test-admin@example.com',
        role: 'admin',
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test topic if created
    if (testTopicId) {
      try {
        const db = await getDatabase();
        await db.collection(TOPICS_COLLECTION_NAME).deleteOne({ _id: new ObjectId(testTopicId) });
      } catch (error) {
        console.log('Cleanup: Test topic already removed or not found');
      }
    }
    await closeDatabase();
  });

  describe('AI Service - Image Generation', () => {
    it('should have Gemini API key configured', () => {
      expect(config.geminiApiKey).toBeDefined();
      expect(config.geminiApiKey.length).toBeGreaterThan(0);
    });

    it('should generate an image using gemini-3-pro-image-preview model', async () => {
      const testPrompt = `Create a simple abstract geometric illustration.
        Style: Minimal, flat design.
        Colors: Blue (#2A6478) and coral (#D94F4F).
        Composition: Simple overlapping circles and squares.
        Aspect ratio: 4:3 landscape.
        NO text, NO people.`;

      // This test makes a real API call to Gemini
      const imageBuffer = await aiService.generateImage(testPrompt);

      expect(imageBuffer).toBeInstanceOf(Buffer);
      expect(imageBuffer.length).toBeGreaterThan(0);

      // PNG files start with these magic bytes
      const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const isPng = imageBuffer.slice(0, 4).equals(pngMagicBytes);

      // JPEG files start with these magic bytes
      const jpegMagicBytes = Buffer.from([0xff, 0xd8, 0xff]);
      const isJpeg = imageBuffer.slice(0, 3).equals(jpegMagicBytes);

      expect(isPng || isJpeg).toBe(true);
      console.log(`Image generated successfully: ${imageBuffer.length} bytes, format: ${isPng ? 'PNG' : 'JPEG'}`);
    }, 60000); // 60 second timeout for API call
  });

  describe('Topic Service - Image Generation', () => {
    it('should build correct illustration prompt for OC4IDS topic', () => {
      const prompt = topicService.buildIllustrationPrompt(
        'OC4IDS',
        'Standards, tools, and documentation for the Open Contracting for Infrastructure Data Standard.'
      );

      expect(prompt).toContain('OC4IDS');
      expect(prompt).toContain('Harvard Business Review');
      expect(prompt).toContain('NO people');
      expect(prompt).toContain('Architecture of Open Data');
    });

    it('should build correct illustration prompt for Independent Review topic', () => {
      const prompt = topicService.buildIllustrationPrompt(
        'Independent Review',
        'Manuals and guides for conducting independent review and validation.'
      );

      expect(prompt).toContain('Independent Review');
      expect(prompt).toContain('Lens of Accountability');
      expect(prompt).toContain('NO people');
    });

    it('should use default concept for unknown topic', () => {
      const prompt = topicService.buildIllustrationPrompt(
        'Unknown Topic',
        'Some description'
      );

      expect(prompt).toContain('Unknown Topic');
      expect(prompt).toContain('Transparency in Motion');
    });

    it('should generate fallback image when AI fails', () => {
      const fallbackImage = topicService.generateFallbackImage('Test Topic');

      expect(fallbackImage).toContain('data:image/svg+xml');
      // The text is URL-encoded in the SVG data URL
      const decodedFallback = decodeURIComponent(fallbackImage);
      expect(decodedFallback).toContain('Test Topic');
      expect(decodedFallback).toContain('<svg');
      expect(decodedFallback).toContain('linearGradient');
    });

    it('should create topic and generate AI image', async () => {
      const topicInput = {
        name: `Test Topic ${Date.now()}`,
        description: 'A test topic for verifying image generation with Gemini 3 Pro Image Preview',
        displayOrder: 999,
        isActive: false, // Keep inactive so it doesn't affect production
      };

      const topic = await topicService.createTopic(topicInput, testUserId);

      testTopicId = topic._id!.toString();

      expect(topic).toBeDefined();
      expect(topic.name).toBe(topicInput.name);
      expect(topic.aiGeneratedImage).toBeDefined();

      // Check if it's a GCS URL or a data URL (depending on GCS configuration)
      const isGcsUrl = topic.aiGeneratedImage?.startsWith('https://storage.googleapis.com');
      const isDataUrl = topic.aiGeneratedImage?.startsWith('data:');

      expect(isGcsUrl || isDataUrl).toBe(true);
      console.log(`Topic created with image: ${topic.aiGeneratedImage?.substring(0, 80)}...`);
    }, 90000); // 90 second timeout for topic creation with image generation

    it('should regenerate topic image', async () => {
      // Skip if no test topic was created
      if (!testTopicId) {
        console.log('Skipping: No test topic available');
        return;
      }

      const originalTopic = await topicService.getTopicById(testTopicId);
      const originalImage = originalTopic?.aiGeneratedImage;

      const updatedTopic = await topicService.regenerateImage(testTopicId, testUserId);

      expect(updatedTopic).toBeDefined();
      expect(updatedTopic.aiGeneratedImage).toBeDefined();

      // The new image should be different (different timestamp in URL or different content)
      // Note: Due to GCS URL containing timestamp, they will be different
      console.log(`Original image: ${originalImage?.substring(0, 80)}...`);
      console.log(`New image: ${updatedTopic.aiGeneratedImage?.substring(0, 80)}...`);
    }, 90000); // 90 second timeout for image regeneration
  });

  describe('Model Configuration Verification', () => {
    it('should confirm gemini-3-pro-image-preview is configured in aiService', async () => {
      // Read the aiService source to verify the model
      // This is a meta-test to ensure we're using the correct model
      const fs = await import('fs');
      const path = await import('path');

      const aiServicePath = path.join(__dirname, '../services/aiService.ts');
      const aiServiceContent = fs.readFileSync(aiServicePath, 'utf-8');

      // Verify the model constant is set to 'gemini-3-pro-image-preview'
      expect(aiServiceContent).toContain("GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview'");
      expect(aiServiceContent).toContain("model: GEMINI_IMAGE_MODEL");
      expect(aiServiceContent).toContain("responseModalities: ['IMAGE', 'TEXT']");

      console.log('Confirmed: aiService.ts uses gemini-3-pro-image-preview model via GEMINI_IMAGE_MODEL constant');
    });

    it('should NOT use outdated models for image generation', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const aiServicePath = path.join(__dirname, '../services/aiService.ts');
      const aiServiceContent = fs.readFileSync(aiServicePath, 'utf-8');

      // Extract the generateImage function content
      const generateImageMatch = aiServiceContent.match(/async generateImage\(prompt: string\)[\s\S]*?throw new ApiError/);
      const generateImageContent = generateImageMatch ? generateImageMatch[0] : '';

      // Ensure we're NOT using any outdated models in generateImage
      const outdatedModels = [
        'gemini-pro-vision',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro',
        'imagen',
        'dall-e',
      ];

      outdatedModels.forEach(model => {
        expect(generateImageContent).not.toContain(`model: '${model}'`);
        expect(generateImageContent).not.toContain(`model: "${model}"`);
      });

      console.log('Verified: No outdated models are used for image generation');
    });

    it('should have IMAGE in response modalities for image generation', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const aiServicePath = path.join(__dirname, '../services/aiService.ts');
      const aiServiceContent = fs.readFileSync(aiServicePath, 'utf-8');

      // The generateImage function must request IMAGE modality
      expect(aiServiceContent).toContain("responseModalities: ['IMAGE'");
      expect(aiServiceContent).toContain("'IMAGE'");

      console.log('Verified: IMAGE modality is requested in generateImage');
    });

    it('should use the correct Gemini SDK method', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const aiServicePath = path.join(__dirname, '../services/aiService.ts');
      const aiServiceContent = fs.readFileSync(aiServicePath, 'utf-8');

      // Verify we're using the @google/genai SDK
      expect(aiServiceContent).toContain("from '@google/genai'");
      expect(aiServiceContent).toContain('aiClient.models.generateContent');

      console.log('Verified: Using @google/genai SDK with generateContent method');
    });
  });

  describe('Image Generation Error Handling', () => {
    it('should handle invalid prompts gracefully in fallback', () => {
      // Empty topic name should still generate fallback
      const emptyFallback = topicService.generateFallbackImage('');
      expect(emptyFallback).toContain('data:image/svg+xml');

      // Special characters should be escaped
      const specialCharsFallback = topicService.generateFallbackImage('<script>alert("xss")</script>');
      const decodedSpecial = decodeURIComponent(specialCharsFallback);
      expect(decodedSpecial).not.toContain('<script>');
      expect(decodedSpecial).toContain('&lt;script&gt;');
    });

    it('should include proper logging in image generation', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const aiServicePath = path.join(__dirname, '../services/aiService.ts');
      const aiServiceContent = fs.readFileSync(aiServicePath, 'utf-8');

      // Verify logging is in place for debugging
      expect(aiServiceContent).toContain("console.log('=== AI Image Generation Started");
      expect(aiServiceContent).toContain("console.log('Using Gemini model:");
      expect(aiServiceContent).toContain("console.log('Image Generation Success:");
      expect(aiServiceContent).toContain("console.error('=== Image Generation Error");
    });
  });
});
