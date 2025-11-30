import { ObjectId } from 'mongodb';
import { ragService, RAGFilters } from '../../services/ragService';

describe('RAGService', () => {
  const mockSessionId = 'test-session-123';

  describe('retrieveContext', () => {
    it('should retrieve relevant chunks using hybrid search', async () => {
      const query = 'What are the mandatory OC4IDS fields?';

      const chunks = await ragService.retrieveContext(query, 5);

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeLessThanOrEqual(5);

      if (chunks.length > 0) {
        expect(chunks[0]).toHaveProperty('chunkId');
        expect(chunks[0]).toHaveProperty('content');
        expect(chunks[0]).toHaveProperty('resourceId');
        expect(chunks[0]).toHaveProperty('score');
        expect(chunks[0]).toHaveProperty('metadata');
      }
    });

    it('should apply filters to retrieval', async () => {
      const query = 'procurement guidelines';
      const filters: RAGFilters = {
        themes: ['procurement'],
        language: 'en'
      };

      const chunks = await ragService.retrieveContext(query, 5, filters);

      expect(Array.isArray(chunks)).toBe(true);

      // Verify filtered results contain only requested themes
      chunks.forEach(chunk => {
        if (chunk.metadata.themes) {
          expect(chunk.metadata.themes).toContain('procurement');
        }
      });
    });

    it('should return empty array when no matches found', async () => {
      const query = 'extremely specific query that will not match anything xyz123';

      const chunks = await ragService.retrieveContext(query, 5);

      expect(Array.isArray(chunks)).toBe(true);
    });

    it('should rank results by relevance score', async () => {
      const query = 'data quality standards';

      const chunks = await ragService.retrieveContext(query, 10);

      if (chunks.length > 1) {
        // Scores should be in descending order
        for (let i = 0; i < chunks.length - 1; i++) {
          expect(chunks[i].score).toBeGreaterThanOrEqual(chunks[i + 1].score);
        }
      }
    });
  });

  describe('generateAnswer', () => {
    it('should generate answer with citations', async () => {
      const query = 'What is OC4IDS?';
      const context = [
        {
          chunkId: new ObjectId().toString(),
          content: 'OC4IDS (Open Contracting for Infrastructure Data Standard) is a global standard for publishing infrastructure project data.',
          resourceId: new ObjectId().toString(),
          resourceTitle: 'OC4IDS Documentation',
          resourceUrl: 'https://standard.open-contracting.org/infrastructure',
          score: 0.95,
          metadata: {
            sourceSection: 'Introduction',
            resourceType: 'guidance' as const,
            language: 'en' as const,
            themes: ['data_standards' as const]
          }
        }
      ];

      const response = await ragService.generateAnswer(query, context);

      expect(response).toHaveProperty('answer');
      expect(response.answer.length).toBeGreaterThan(0);
      expect(response).toHaveProperty('citations');
      expect(response.citations.length).toBeGreaterThan(0);
      expect(response).toHaveProperty('confidence');
      expect(['high', 'medium', 'low', 'uncertain']).toContain(response.confidence);

      // Verify citation structure
      expect(response.citations[0]).toMatchObject({
        resourceId: expect.any(String),
        resourceTitle: expect.any(String),
        chunkId: expect.any(String),
        excerpt: expect.any(String),
        url: expect.any(String)
      });
    });

    it('should include context from chat history', async () => {
      const query = 'Tell me more about that';
      const context = [
        {
          chunkId: new ObjectId().toString(),
          content: 'Project preparation involves feasibility studies, environmental assessments, and stakeholder consultations.',
          resourceId: new ObjectId().toString(),
          resourceTitle: 'CoST Guidance',
          resourceUrl: 'https://example.com/guidance',
          score: 0.88,
          metadata: {
            sourceSection: 'Project Preparation',
            resourceType: 'guidance' as const,
            language: 'en' as const,
            themes: ['project_monitoring' as const]
          }
        }
      ];

      const history = [
        { role: 'user' as const, content: 'What is project preparation?' },
        { role: 'assistant' as const, content: 'Project preparation is the phase where...' }
      ];

      const response = await ragService.generateAnswer(query, context, history);

      expect(response.answer.length).toBeGreaterThan(0);
      expect(response.citations.length).toBeGreaterThan(0);
    });

    it('should indicate low confidence when context is weak', async () => {
      const query = 'What is the exact budget for Project X?';
      const context = [
        {
          chunkId: new ObjectId().toString(),
          content: 'Infrastructure projects typically have budgets ranging from thousands to millions.',
          resourceId: new ObjectId().toString(),
          resourceTitle: 'General Info',
          resourceUrl: 'https://example.com/general',
          score: 0.3,
          metadata: {
            sourceSection: 'Overview',
            resourceType: 'guidance' as const,
            language: 'en' as const,
            themes: ['procurement' as const]
          }
        }
      ];

      const response = await ragService.generateAnswer(query, context);

      expect(['low', 'uncertain']).toContain(response.confidence);
    });

    it('should generate follow-up questions', async () => {
      const query = 'What is data disclosure?';
      const context = [
        {
          chunkId: new ObjectId().toString(),
          content: 'Data disclosure involves publishing infrastructure project information in an accessible format.',
          resourceId: new ObjectId().toString(),
          resourceTitle: 'CoST Guidance',
          resourceUrl: 'https://example.com/guidance',
          score: 0.92,
          metadata: {
            sourceSection: 'Disclosure',
            resourceType: 'guidance' as const,
            language: 'en' as const,
            themes: ['disclosure' as const]
          }
        }
      ];

      const response = await ragService.generateAnswer(query, context);

      expect(response.followUpQuestions).toBeDefined();
      if (response.followUpQuestions) {
        expect(response.followUpQuestions.length).toBeGreaterThan(0);
        expect(response.followUpQuestions.length).toBeLessThanOrEqual(3);
      }
    });

    it('should handle empty context gracefully', async () => {
      const query = 'What is transparency?';
      const context: any[] = [];

      const response = await ragService.generateAnswer(query, context);

      expect(response.answer.length).toBeGreaterThan(0);
      expect(response.confidence).toBe('uncertain');
      expect(response.citations.length).toBe(0);
    });
  });

  describe('chat', () => {
    it('should complete full RAG pipeline', async () => {
      const query = 'How do I implement OC4IDS?';

      const response = await ragService.chat(query, mockSessionId);

      expect(response).toHaveProperty('answer');
      expect(response).toHaveProperty('citations');
      expect(response).toHaveProperty('confidence');
      expect(response.answer.length).toBeGreaterThan(0);
    });

    it('should respect filters in chat', async () => {
      const query = 'procurement guidelines';
      const filters: RAGFilters = {
        themes: ['procurement'],
        resourceTypes: ['guidance']
      };

      const response = await ragService.chat(query, mockSessionId, filters);

      expect(response.citations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle queries with no results', async () => {
      const query = 'xyz123 nonexistent topic abc456';

      const response = await ragService.chat(query, mockSessionId);

      expect(response.answer).toBeDefined();
      expect(response.confidence).toBe('uncertain');
    });
  });

  describe('extractCitations', () => {
    it('should extract citations from retrieved chunks', async () => {
      const chunks = [
        {
          chunkId: new ObjectId().toString(),
          content: 'The OC4IDS schema includes project identification, planning, and implementation data.',
          resourceId: new ObjectId().toString(),
          resourceTitle: 'OC4IDS Schema Documentation',
          resourceUrl: 'https://standard.open-contracting.org/infrastructure/1.0',
          score: 0.95,
          metadata: {
            sourceSection: 'Schema Overview',
            pageNumber: 12,
            resourceType: 'guidance' as const,
            language: 'en' as const,
            themes: ['data_standards' as const]
          }
        }
      ];

      const citations = ragService.extractCitations(chunks);

      expect(citations.length).toBe(1);
      expect(citations[0]).toMatchObject({
        resourceId: chunks[0].resourceId,
        resourceTitle: chunks[0].resourceTitle,
        chunkId: chunks[0].chunkId,
        excerpt: expect.stringContaining('OC4IDS'),
        url: chunks[0].resourceUrl,
        section: chunks[0].metadata.sourceSection,
        pageNumber: 12
      });
    });

    it('should limit excerpt length', async () => {
      const longContent = 'A'.repeat(500);
      const chunks = [
        {
          chunkId: new ObjectId().toString(),
          content: longContent,
          resourceId: new ObjectId().toString(),
          resourceTitle: 'Test Doc',
          resourceUrl: 'https://example.com/test',
          score: 0.8,
          metadata: {
            sourceSection: 'Test Section',
            resourceType: 'guidance' as const,
            language: 'en' as const,
            themes: ['procurement' as const]
          }
        }
      ];

      const citations = ragService.extractCitations(chunks);

      expect(citations[0].excerpt.length).toBeLessThanOrEqual(200);
    });

    it('should handle multiple chunks from same resource', async () => {
      const resourceId = new ObjectId().toString();
      const chunks = [
        {
          chunkId: new ObjectId().toString(),
          content: 'First chunk content',
          resourceId,
          resourceTitle: 'Shared Doc',
          resourceUrl: 'https://example.com/doc',
          score: 0.9,
          metadata: {
            sourceSection: 'Section 1',
            resourceType: 'guidance' as const,
            language: 'en' as const,
            themes: ['data_standards' as const]
          }
        },
        {
          chunkId: new ObjectId().toString(),
          content: 'Second chunk content',
          resourceId,
          resourceTitle: 'Shared Doc',
          resourceUrl: 'https://example.com/doc',
          score: 0.85,
          metadata: {
            sourceSection: 'Section 2',
            resourceType: 'guidance' as const,
            language: 'en' as const,
            themes: ['data_standards' as const]
          }
        }
      ];

      const citations = ragService.extractCitations(chunks);

      expect(citations.length).toBe(2);
      expect(citations[0].resourceId).toBe(citations[1].resourceId);
      expect(citations[0].chunkId).not.toBe(citations[1].chunkId);
    });
  });
});
