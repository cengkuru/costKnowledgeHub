import { ObjectId, Collection } from 'mongodb';
import { chunkingService } from '../../services/chunkingService';
import { ResourceType } from '../../models/Resource';
import { DocumentChunk } from '../../models/DocumentChunk';

// Mock the database
jest.mock('../../config/database', () => ({
  db: {
    collection: jest.fn()
  }
}));

// Mock AI service
jest.mock('../../services/aiService', () => ({
  getAI: jest.fn(() => ({
    models: {
      embedContent: jest.fn(async () => ({
        embeddings: [{ values: new Array(1536).fill(0.1) }]
      }))
    }
  }))
}));

describe('ChunkingService', () => {
  const mockResourceId = new ObjectId();
  const mockUserId = new ObjectId();

  let mockCollection: any;

  beforeEach(() => {
    // Reset mocks
    mockCollection = {
      find: jest.fn(() => ({
        toArray: jest.fn(async () => [])
      })),
      bulkWrite: jest.fn(async () => ({ insertedCount: 1 })),
      deleteMany: jest.fn(async () => ({ deletedCount: 1 }))
    };

    const { db } = require('../../config/database');
    db.collection = jest.fn(() => mockCollection);
  });

  describe('chunkDocument', () => {
    it('should chunk guidance document by headings', async () => {
      const content = `
# Introduction to OC4IDS

This is an introduction paragraph with general overview.

## Section 1: Data Standards

Content about data standards that explains the core concepts.
This section has multiple paragraphs to test chunking behavior.

## Section 2: Implementation Guide

Implementation details go here with step-by-step instructions.
More content to ensure this chunk is substantial enough.

### Subsection 2.1: Setup

Detailed setup instructions for implementers.
      `;

      const chunks = await chunkingService.chunkDocument(
        mockResourceId,
        content,
        'guidance' as ResourceType,
        'en',
        ['data_standards']
      );

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toMatchObject({
        resourceId: mockResourceId,
        resourceType: 'guidance',
        language: 'en'
      });

      // Each chunk should have source tracking
      chunks.forEach(chunk => {
        expect(chunk.sourceSection).toBeDefined();
        expect(chunk.charStart).toBeGreaterThanOrEqual(0);
        expect(chunk.charEnd).toBeGreaterThan(chunk.charStart);
        expect(chunk.content.length).toBeGreaterThan(50);
      });
    });

    it('should chunk assurance report by findings', async () => {
      const content = `
FINDING 1: Data Quality Issues

The review identified significant data quality issues in the procurement records.
Recommendation: Implement automated validation checks.

FINDING 2: Transparency Gaps

Several infrastructure projects lack complete disclosure.
Recommendation: Mandate full disclosure for all projects over $1M.
      `;

      const chunks = await chunkingService.chunkDocument(
        mockResourceId,
        content,
        'assurance_report' as ResourceType,
        'en',
        ['procurement']
      );

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0].sourceSection).toContain('FINDING');
    });

    it('should chunk tool by steps', async () => {
      const content = `
Step 1: Download the Template

Navigate to the CoST portal and download the OC4IDS template.

Step 2: Populate Data Fields

Fill in all mandatory fields according to the schema documentation.

Step 3: Validate Your Data

Use the online validator tool to check for errors.

Step 4: Submit for Review

Upload your completed file to the submission portal.
      `;

      const chunks = await chunkingService.chunkDocument(
        mockResourceId,
        content,
        'tool' as ResourceType,
        'en',
        ['digital_tools']
      );

      expect(chunks.length).toBeGreaterThanOrEqual(3);
      chunks.forEach(chunk => {
        expect(chunk.resourceType).toBe('tool');
      });
    });

    it('should handle empty or invalid content', async () => {
      await expect(
        chunkingService.chunkDocument(mockResourceId, '', 'guidance' as ResourceType, 'en', [])
      ).rejects.toThrow();
    });

    it('should respect min/max token limits per type', async () => {
      const longContent = 'A'.repeat(10000); // Very long content

      const chunks = await chunkingService.chunkDocument(
        mockResourceId,
        longContent,
        'guidance' as ResourceType,
        'en',
        ['data_standards']
      );

      // Each chunk should be within token limits (roughly 500-1000 tokens = 2000-4000 chars)
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThan(5000);
        expect(chunk.content.length).toBeGreaterThan(200);
      });
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for chunks', async () => {
      const chunks: DocumentChunk[] = [
        {
          resourceId: mockResourceId,
          content: 'This is a test chunk about OC4IDS data standards.',
          sourceSection: 'Test Section',
          charStart: 0,
          charEnd: 50,
          resourceType: 'guidance' as ResourceType,
          language: 'en',
          themes: ['data_standards'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const chunksWithEmbeddings = await chunkingService.generateEmbeddings(chunks);

      expect(chunksWithEmbeddings.length).toBe(1);
      expect(chunksWithEmbeddings[0].embedding).toBeDefined();
      expect(Array.isArray(chunksWithEmbeddings[0].embedding)).toBe(true);
      expect(chunksWithEmbeddings[0].embedding?.length).toBeGreaterThan(0);
    });

    it('should handle batch embedding generation', async () => {
      const chunks: DocumentChunk[] = Array.from({ length: 5 }, (_, i) => ({
        resourceId: mockResourceId,
        content: `Test chunk ${i} with different content about infrastructure transparency.`,
        sourceSection: `Section ${i}`,
        charStart: i * 100,
        charEnd: (i + 1) * 100,
        resourceType: 'guidance' as ResourceType,
        language: 'en',
        themes: ['procurement'],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const chunksWithEmbeddings = await chunkingService.generateEmbeddings(chunks);

      expect(chunksWithEmbeddings.length).toBe(5);
      chunksWithEmbeddings.forEach(chunk => {
        expect(chunk.embedding).toBeDefined();
      });
    });

    it('should skip chunks that already have embeddings', async () => {
      const existingEmbedding = new Array(1536).fill(0.5);
      const chunks: DocumentChunk[] = [
        {
          resourceId: mockResourceId,
          content: 'Chunk with existing embedding',
          embedding: existingEmbedding,
          sourceSection: 'Test',
          charStart: 0,
          charEnd: 30,
          resourceType: 'guidance' as ResourceType,
          language: 'en',
          themes: ['data_standards'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const result = await chunkingService.generateEmbeddings(chunks);

      expect(result[0].embedding).toEqual(existingEmbedding);
    });
  });

  describe('storeChunks', () => {
    it('should store chunks in database', async () => {
      const chunks: DocumentChunk[] = [
        {
          resourceId: mockResourceId,
          content: 'Test chunk content that is sufficiently long to meet the minimum 50 character requirement for validation.',
          embedding: new Array(1536).fill(0.1),
          sourceSection: 'Introduction',
          charStart: 0,
          charEnd: 110,
          resourceType: 'guidance' as ResourceType,
          language: 'en',
          themes: ['data_standards'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await expect(chunkingService.storeChunks(chunks)).resolves.not.toThrow();
    });

    it('should update existing chunks', async () => {
      const chunkId = new ObjectId();
      const chunks: DocumentChunk[] = [
        {
          _id: chunkId,
          resourceId: mockResourceId,
          content: 'Updated chunk content that is sufficiently long to meet validation requirements.',
          embedding: new Array(1536).fill(0.2),
          sourceSection: 'Updated Section',
          charStart: 0,
          charEnd: 84,
          resourceType: 'guidance' as ResourceType,
          language: 'en',
          themes: ['procurement'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await expect(chunkingService.storeChunks(chunks)).resolves.not.toThrow();
    });

    it('should validate chunks before storing', async () => {
      const invalidChunks: any[] = [
        {
          resourceId: mockResourceId,
          // Missing required fields
          content: 'Too short',
          sourceSection: ''
        }
      ];

      await expect(chunkingService.storeChunks(invalidChunks)).rejects.toThrow();
    });
  });

  describe('getChunksForResource', () => {
    it('should retrieve all chunks for a resource', async () => {
      const chunks = await chunkingService.getChunksForResource(mockResourceId);

      expect(Array.isArray(chunks)).toBe(true);
      chunks.forEach(chunk => {
        expect(chunk.resourceId.toString()).toBe(mockResourceId.toString());
      });
    });

    it('should return empty array for resource with no chunks', async () => {
      const nonExistentId = new ObjectId();
      const chunks = await chunkingService.getChunksForResource(nonExistentId);

      expect(chunks).toEqual([]);
    });
  });

  describe('deleteChunksForResource', () => {
    it('should delete all chunks for a resource', async () => {
      const deleteCount = await chunkingService.deleteChunksForResource(mockResourceId);

      expect(typeof deleteCount).toBe('number');
      expect(deleteCount).toBeGreaterThanOrEqual(0);
    });
  });
});
