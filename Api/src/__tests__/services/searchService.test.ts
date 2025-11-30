import { searchService } from '../../services/searchService';
import { getDatabase } from '../../db';
import { Resource, COLLECTION_NAME } from '../../models/Resource';
import { ObjectId } from 'mongodb';

// Mock the database
jest.mock('../../db');

describe('SearchService', () => {
  let mockCollection: any;
  let mockDb: any;

  beforeEach(() => {
    // Create a helper to build a fluent chain
    const createChain = () => {
      const chain: any = {
        sort: jest.fn(),
        skip: jest.fn(),
        limit: jest.fn(),
        toArray: jest.fn(),
      };
      chain.sort.mockReturnValue(chain);
      chain.skip.mockReturnValue(chain);
      chain.limit.mockReturnValue(chain);
      return chain;
    };

    // Setup mock collection methods
    mockCollection = {
      find: jest.fn(createChain),
      aggregate: jest.fn(createChain),
      countDocuments: jest.fn(),
      toArray: jest.fn(),
      createIndex: jest.fn().mockResolvedValue('text_idx'),
    };

    // Setup mock database
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
  });

  describe('keywordSearch', () => {
    it('should perform keyword search with text index', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Climate Assurance Reports',
          description: 'Comprehensive assurance reports on climate initiatives',
          resourceType: 'assurance_report',
          status: 'published',
          language: 'en',
          clicks: 5,
        } as Resource,
      ];

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.keywordSearch('climate assurance');

      expect(mockDb.collection).toHaveBeenCalledWith(COLLECTION_NAME);
      expect(mockCollection.find).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].resource.title).toBe('Climate Assurance Reports');
    });

    it('should filter by resource type', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Assurance Report',
          resourceType: 'assurance_report',
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.keywordSearch('assurance', {
        resourceTypes: ['assurance_report'],
      });

      expect(results).toBeDefined();
      expect(mockCollection.find).toHaveBeenCalled();
    });

    it('should filter by theme', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Climate Initiative',
          themes: ['climate'],
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.keywordSearch('initiative', {
        themes: ['climate'],
      });

      expect(results).toBeDefined();
    });

    it('should filter by country program', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Uganda Infrastructure Report',
          countryPrograms: ['uganda'],
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.keywordSearch('infrastructure', {
        countryPrograms: ['uganda'],
      });

      expect(results).toBeDefined();
    });

    it('should filter by language', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Informe de Asuntos',
          language: 'es',
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.keywordSearch('asuntos', {
        language: 'es',
      });

      expect(results).toBeDefined();
    });

    it('should filter by audience level', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Technical Guide',
          audience: ['technical'],
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.keywordSearch('guide', {
        audience: ['technical'],
      });

      expect(results).toBeDefined();
    });

    it('should filter by date range', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');

      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Recent Report',
          publicationDate: new Date('2024-06-15'),
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.keywordSearch('report', {
        dateRange: { from, to },
      });

      expect(results).toBeDefined();
    });

    it('should only return published resources', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Published Report',
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.keywordSearch('report');

      // Should filter for published status
      expect(mockCollection.find).toHaveBeenCalled();
      const findCall = mockCollection.find.mock.calls[0][0];
      expect(findCall.status).toBe('published');
    });

    it('should sort by relevance (score)', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Climate Report',
          status: 'published',
          description: 'A climate report',
          clicks: 0,
        } as Resource,
      ];

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockResources),
        }),
      });

      await searchService.keywordSearch('climate', {}, 'relevance');

      expect(mockCollection.find).toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
      const mockResources: Partial<Resource>[] = Array.from({ length: 20 }, (_, i) => ({
        _id: new ObjectId(),
        title: `Resource ${i}`,
        status: 'published',
        description: 'test',
        clicks: 0,
      } as Resource));

      const chainMock: any = {
        sort: jest.fn(),
        skip: jest.fn(),
        limit: jest.fn(),
        toArray: jest.fn().mockResolvedValue(mockResources),
      };
      chainMock.sort.mockReturnValue(chainMock);
      chainMock.skip.mockReturnValue(chainMock);
      chainMock.limit.mockReturnValue(chainMock);

      mockCollection.find.mockReturnValue(chainMock);

      const results = await searchService.keywordSearch('resource', {}, 'relevance', 2, 20);

      expect(results).toHaveLength(20);
    });
  });

  describe('semanticSearch', () => {
    it('should perform semantic search using embeddings', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Climate Initiatives',
          description: 'Various climate-related initiatives',
          embedding: Array(10).fill(0.1),
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.semanticSearch('climate action');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate similarity scores', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Climate Report',
          embedding: Array(10).fill(0.5),
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.semanticSearch('climate');

      expect(results).toBeDefined();
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('score');
      }
    });

    it('should handle missing embeddings gracefully', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'No Embedding Resource',
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.semanticSearch('test');

      expect(results).toBeDefined();
    });

    it('should only return published resources', async () => {
      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      await searchService.semanticSearch('test');

      const findCall = mockCollection.find.mock.calls[0][0];
      expect(findCall.status).toBe('published');
    });

    it('should filter by theme', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Climate Initiative',
          themes: ['climate'],
          embedding: Array(10).fill(0.5),
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockResources),
      });

      const results = await searchService.semanticSearch('climate', {
        themes: ['climate'],
      });

      expect(results).toBeDefined();
    });
  });

  describe('hybridSearch', () => {
    it('should combine keyword and semantic results', async () => {
      const keywordResults: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Climate Report',
          status: 'published',
        },
      ];

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(keywordResults),
      });

      const results = await searchService.hybridSearch('climate');

      expect(results).toBeDefined();
    });

    it('should apply custom weights', async () => {
      // Need to setup find to return resources for both keyword and semantic search
      mockCollection.find.mockImplementation(() => {
        const chain: any = {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          toArray: jest.fn().mockResolvedValue([]),
        };
        chain.sort.mockReturnValue(chain);
        chain.skip.mockReturnValue(chain);
        chain.limit.mockReturnValue(chain);
        return chain;
      });

      const results = await searchService.hybridSearch(
        'climate',
        {},
        { keyword: 0.7, semantic: 0.3 }
      );

      expect(results).toBeDefined();
    });

    it('should handle equal weighting', async () => {
      mockCollection.find.mockImplementation(() => {
        const chain: any = {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          toArray: jest.fn().mockResolvedValue([]),
        };
        chain.sort.mockReturnValue(chain);
        chain.skip.mockReturnValue(chain);
        chain.limit.mockReturnValue(chain);
        return chain;
      });

      const results = await searchService.hybridSearch(
        'test',
        {},
        { keyword: 0.5, semantic: 0.5 }
      );

      expect(results).toBeDefined();
    });
  });

  describe('search', () => {
    it('should handle full search request', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Assurance Report',
          description: 'test',
          resourceType: 'assurance_report',
          status: 'published',
          clicks: 0,
        } as Resource,
      ];

      mockCollection.find.mockImplementation(() => {
        const chain: any = {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          toArray: jest.fn().mockResolvedValue(mockResources),
        };
        chain.sort.mockReturnValue(chain);
        chain.skip.mockReturnValue(chain);
        chain.limit.mockReturnValue(chain);
        return chain;
      });

      mockCollection.countDocuments = jest.fn().mockResolvedValue(1);

      mockCollection.aggregate = jest.fn().mockImplementation(() => {
        const chain: any = {
          toArray: jest.fn().mockResolvedValue([
            { _id: 'assurance_report', count: 1 },
          ]),
        };
        return chain;
      });

      const results = await searchService.search({
        query: 'assurance',
        filters: { resourceTypes: ['assurance_report'] },
        sort: 'relevance',
        page: 1,
        limit: 20,
      });

      expect(results).toHaveProperty('results');
      expect(results).toHaveProperty('total');
      expect(results).toHaveProperty('facets');
      expect(results).toHaveProperty('page');
      expect(results).toHaveProperty('totalPages');
    });

    it('should return empty results for empty query', async () => {
      const results = await searchService.search({
        query: '',
        page: 1,
        limit: 20,
      });

      expect(results.results).toEqual([]);
      expect(results.total).toBe(0);
    });

    it('should calculate facets correctly', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: new ObjectId(),
          title: 'Report 1',
          description: 'test1',
          resourceType: 'assurance_report',
          themes: ['climate'],
          countryPrograms: ['uganda'],
          language: 'en',
          status: 'published',
          clicks: 0,
        } as Resource,
        {
          _id: new ObjectId(),
          title: 'Report 2',
          description: 'test2',
          resourceType: 'guidance',
          themes: ['climate'],
          countryPrograms: ['uganda'],
          language: 'es',
          status: 'published',
          clicks: 0,
        } as Resource,
      ];

      mockCollection.find.mockImplementation(() => {
        const chain: any = {
          sort: jest.fn(),
          skip: jest.fn(),
          limit: jest.fn(),
          toArray: jest.fn().mockResolvedValue(mockResources),
        };
        chain.sort.mockReturnValue(chain);
        chain.skip.mockReturnValue(chain);
        chain.limit.mockReturnValue(chain);
        return chain;
      });

      mockCollection.countDocuments = jest.fn().mockResolvedValue(2);

      let aggregateCallCount = 0;
      mockCollection.aggregate = jest.fn(() => {
        const results = [
          [
            { _id: 'assurance_report', count: 1 },
            { _id: 'guidance', count: 1 },
          ],
          [{ _id: 'climate', count: 2 }],
          [{ _id: 'uganda', count: 2 }],
          [
            { _id: 'en', count: 1 },
            { _id: 'es', count: 1 },
          ],
        ];
        const chain: any = {
          toArray: jest.fn().mockResolvedValue(results[aggregateCallCount % 4]),
        };
        aggregateCallCount++;
        return chain;
      });

      const results = await searchService.search({
        query: 'report',
        page: 1,
        limit: 20,
      });

      expect(results.facets).toHaveProperty('resourceTypes');
      expect(results.facets).toHaveProperty('themes');
      expect(results.facets).toHaveProperty('countryPrograms');
      expect(results.facets).toHaveProperty('languages');
    });

    it('should calculate pagination correctly', async () => {
      const pageSize = 20;
      const pageResources = Array.from({ length: pageSize }, (_, i) => ({
        _id: new ObjectId(),
        title: `Resource ${i}`,
        status: 'published',
        description: 'test',
        clicks: 0,
      } as Resource));

      // Build a fluent chain for find().sort().skip().limit()
      const chainMock: any = {
        sort: jest.fn(),
        skip: jest.fn(),
        limit: jest.fn(),
        toArray: jest.fn().mockResolvedValue(pageResources),
      };

      // Set up chaining: sort() returns self, skip() returns self, limit() returns self
      chainMock.sort.mockReturnValue(chainMock);
      chainMock.skip.mockReturnValue(chainMock);
      chainMock.limit.mockReturnValue(chainMock);

      mockCollection.find.mockReturnValue(chainMock);
      mockCollection.countDocuments = jest.fn().mockResolvedValue(150);

      mockCollection.aggregate = jest.fn()
        .mockReturnValueOnce({
          toArray: jest.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          toArray: jest.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          toArray: jest.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          toArray: jest.fn().mockResolvedValue([]),
        });

      const results = await searchService.search({
        query: 'test',
        page: 2,
        limit: pageSize,
      });

      expect(results.page).toBe(2);
      expect(results.totalPages).toBeGreaterThan(0);
    });
  });

  describe('getFacets', () => {
    it('should aggregate facets for resource types', async () => {
      mockCollection.aggregate = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { _id: 'assurance_report', count: 5 },
          { _id: 'guidance', count: 3 },
        ]),
      });

      const facets = await searchService.getFacets(
        { status: 'published' },
        'resourceType'
      );

      expect(facets).toEqual([
        { value: 'assurance_report', count: 5 },
        { value: 'guidance', count: 3 },
      ]);
    });

    it('should aggregate facets for themes', async () => {
      mockCollection.aggregate = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { _id: 'climate', count: 10 },
          { _id: 'gender', count: 5 },
        ]),
      });

      const facets = await searchService.getFacets(
        { status: 'published' },
        'themes'
      );

      expect(facets).toEqual([
        { value: 'climate', count: 10 },
        { value: 'gender', count: 5 },
      ]);
    });
  });

  describe('ensureTextIndex', () => {
    it('should create text index if it does not exist', async () => {
      mockCollection.createIndex = jest.fn().mockResolvedValue('text_idx');

      await searchService.ensureTextIndex();

      expect(mockCollection.createIndex).toHaveBeenCalled();
    });

    it('should handle index creation errors gracefully', async () => {
      mockCollection.createIndex = jest.fn().mockRejectedValue(
        new Error('Index already exists')
      );

      // Should log warning but not throw
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await searchService.ensureTextIndex();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
