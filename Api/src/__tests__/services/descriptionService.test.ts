import { fillMissingDescriptions, runDescriptionJobNow } from '../../jobs/descriptionJob';
import * as db from '../../db';
import * as aiModule from '../../services/aiService';
import { Resource } from '../../models/Resource';

// Mock database
jest.mock('../../db');

// Mock aiService
jest.mock('../../services/aiService', () => ({
  aiService: {
    generateDescription: jest.fn(),
    suggestTags: jest.fn(),
  },
}));

describe('Description Generation Service', () => {
  let mockCollection: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock database
    mockCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      })
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };

    (db.getDatabase as jest.Mock).mockResolvedValue(mockDb);
  });

  describe('fillMissingDescriptions', () => {
    test('should process resources needing descriptions', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: 'resource1' as any,
          title: 'Resource 1',
          url: 'https://example.com/1',
          description: '',
          descriptionLocked: false
        },
        {
          _id: 'resource2' as any,
          title: 'Resource 2',
          url: 'https://example.com/2',
          description: 'Short',
          descriptionLocked: false
        }
      ];

      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(mockResources)
      });

      // Mock AI responses - return descriptions >20 chars
      (aiModule.aiService.generateDescription as jest.Mock)
        .mockResolvedValueOnce('A comprehensive guide to infrastructure transparency for practitioners.')
        .mockResolvedValueOnce('Technical reference documentation for implementing data standards.');

      const result = await fillMissingDescriptions();

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(2);
    });

    test('should return early when no resources need descriptions', async () => {
      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce([])
      });

      const result = await fillMissingDescriptions();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(mockCollection.updateOne).not.toHaveBeenCalled();
    });

    test('should skip resources when AI returns short description', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: 'resource1' as any,
          title: 'Resource 1',
          url: 'https://example.com/1',
          description: '',
          descriptionLocked: false
        }
      ];

      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(mockResources)
      });

      // Mock AI returning short description
      (aiModule.aiService.generateDescription as jest.Mock)
        .mockResolvedValueOnce('Too short');

      const result = await fillMissingDescriptions();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockCollection.updateOne).not.toHaveBeenCalled();
    });

    test('should handle AI errors gracefully', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: 'resource1' as any,
          title: 'Resource 1',
          url: 'https://example.com/1',
          description: '',
          descriptionLocked: false
        }
      ];

      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(mockResources)
      });

      // Mock AI failure
      (aiModule.aiService.generateDescription as jest.Mock)
        .mockRejectedValueOnce(new Error('AI Error'));

      const result = await fillMissingDescriptions();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });

    test('should update description with correct metadata', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: 'resource1' as any,
          title: 'Test Resource',
          url: 'https://example.com/test',
          description: '',
          descriptionLocked: false
        }
      ];

      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(mockResources)
      });

      (aiModule.aiService.generateDescription as jest.Mock)
        .mockResolvedValueOnce('A well-written description for the test resource that is longer than 20 characters.');

      await fillMissingDescriptions();

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: 'resource1' },
        {
          $set: expect.objectContaining({
            description: 'A well-written description for the test resource that is longer than 20 characters.',
            descriptionSource: 'ai',
            updatedAt: expect.any(Date)
          })
        }
      );
    });

    test('should query for resources with short or missing descriptions', async () => {
      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce([])
      });

      await fillMissingDescriptions();

      expect(mockCollection.find).toHaveBeenCalledWith({
        $and: [
          {
            $or: [
              { description: { $exists: false } },
              { description: '' },
              { description: { $regex: /^.{0,20}$/ } }
            ]
          },
          {
            $or: [
              { descriptionLocked: false },
              { descriptionLocked: { $exists: false } }
            ]
          }
        ]
      });
    });
  });

  describe('runDescriptionJobNow', () => {
    test('should trigger manual run and return results', async () => {
      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce([])
      });

      const result = await runDescriptionJobNow();

      expect(result).toEqual({
        processed: 0,
        failed: 0,
        skipped: 0
      });
    });

    test('should process resources when called manually', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: 'resource1' as any,
          title: 'Manual Test',
          url: 'https://example.com/manual',
          description: '',
          descriptionLocked: false
        }
      ];

      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(mockResources)
      });

      (aiModule.aiService.generateDescription as jest.Mock)
        .mockResolvedValueOnce('Description generated via manual job trigger for testing.');

      const result = await runDescriptionJobNow();

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  describe('Rate limiting', () => {
    test('should add delay between processing resources', async () => {
      const mockResources: Partial<Resource>[] = [
        {
          _id: 'resource1' as any,
          title: 'Resource 1',
          url: 'https://example.com/1',
          description: '',
          descriptionLocked: false
        },
        {
          _id: 'resource2' as any,
          title: 'Resource 2',
          url: 'https://example.com/2',
          description: '',
          descriptionLocked: false
        }
      ];

      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(mockResources)
      });

      (aiModule.aiService.generateDescription as jest.Mock)
        .mockResolvedValueOnce('First description that meets the minimum length requirement.')
        .mockResolvedValueOnce('Second description that also meets the length requirement.');

      const startTime = Date.now();
      await fillMissingDescriptions();
      const duration = Date.now() - startTime;

      // Should take at least 500ms due to rate limiting between requests
      expect(duration).toBeGreaterThanOrEqual(400);
    });
  });
});

describe('Description Query Filter', () => {
  let mockCollection: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };

    (db.getDatabase as jest.Mock).mockResolvedValue(mockDb);
  });

  test('should exclude locked descriptions', async () => {
    mockCollection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValueOnce([])
    });

    await fillMissingDescriptions();

    const findCall = mockCollection.find.mock.calls[0][0];

    // Verify the query excludes locked descriptions
    expect(findCall.$and[1].$or).toContainEqual({ descriptionLocked: false });
    expect(findCall.$and[1].$or).toContainEqual({ descriptionLocked: { $exists: false } });
  });

  test('should find resources with empty descriptions', async () => {
    mockCollection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValueOnce([])
    });

    await fillMissingDescriptions();

    const findCall = mockCollection.find.mock.calls[0][0];

    expect(findCall.$and[0].$or).toContainEqual({ description: '' });
    expect(findCall.$and[0].$or).toContainEqual({ description: { $exists: false } });
  });

  test('should find resources with short descriptions (<= 20 chars)', async () => {
    mockCollection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValueOnce([])
    });

    await fillMissingDescriptions();

    const findCall = mockCollection.find.mock.calls[0][0];

    // Check that regex matches short strings
    const regexCondition = findCall.$and[0].$or.find(
      (c: any) => c.description?.$regex
    );
    expect(regexCondition).toBeDefined();
    expect(regexCondition.description.$regex.test('short')).toBe(true);
    expect(regexCondition.description.$regex.test('this is exactly 20 c')).toBe(true);
    expect(regexCondition.description.$regex.test('this is more than twenty characters')).toBe(false);
  });
});
