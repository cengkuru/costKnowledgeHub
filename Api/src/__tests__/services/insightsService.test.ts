import { ObjectId } from 'mongodb';
import { insightsService } from '../../services/insightsService';
import { getDb } from '../../config/database';

// Mock database
jest.mock('../../config/database', () => ({
  getDb: jest.fn(),
}));

// Mock claudeService
jest.mock('../../services/claudeService', () => ({
  chat: jest.fn().mockResolvedValue({ content: 'This week saw significant engagement growth.' }),
}));

describe('InsightsService', () => {
  let mockResourceCollection: any;
  let mockUserCollection: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockResourceCollection = {
      aggregate: jest.fn(),
      find: jest.fn(),
    };

    mockUserCollection = {
      find: jest.fn(),
    };

    mockDb = {
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'resources') return mockResourceCollection;
        if (name === 'users') return mockUserCollection;
        return mockResourceCollection;
      }),
    };

    (getDb as jest.Mock).mockResolvedValue(mockDb);
  });

  describe('computeEngagementPatterns', () => {
    it('should compute top resources with category comparison', async () => {
      const topClickedMock = [
        {
          _id: new ObjectId(),
          title: 'OC4IDS Manual',
          clicks: 150,
          category: 'OC4IDS',
          lastClickedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          title: 'Assurance Guide',
          clicks: 75,
          category: 'Assurance',
          lastClickedAt: new Date(),
        },
      ];

      const categoryAvgMock = [
        { _id: 'OC4IDS', avgClicks: 15 },
        { _id: 'Assurance', avgClicks: 25 },
      ];

      const totalClicksMock = [{ total: 500 }];
      const prevTotalClicksMock = [{ total: 400 }];

      mockResourceCollection.aggregate
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(topClickedMock) })
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(categoryAvgMock) })
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(totalClicksMock) })
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(prevTotalClicksMock) })
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue([]) });

      const result = await insightsService.computeEngagementPatterns();

      expect(result.topResources.length).toBeGreaterThan(0);
      expect(result.topResources[0].comparisonMultiplier).toBe(10); // 150/15 = 10x
      expect(result.totalClicksThisWeek).toBe(500);
      expect(result.totalClicksPreviousWeek).toBe(400);
      expect(result.weekOverWeekChange).toBe(25); // (500-400)/400 * 100
    });

    it('should handle empty data gracefully', async () => {
      mockResourceCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const result = await insightsService.computeEngagementPatterns();

      expect(result.topResources).toEqual([]);
      expect(result.totalClicksThisWeek).toBe(0);
    });
  });

  describe('identifyContentGaps', () => {
    it('should identify stale categories', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 45);

      const staleCategories = [
        { _id: 'Country Programs', lastEngagement: thirtyDaysAgo },
      ];

      const categoryCounts = [
        { _id: 'Country Programs', count: 15 },
      ];

      mockResourceCollection.aggregate
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(staleCategories) })
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(categoryCounts) });

      const result = await insightsService.identifyContentGaps();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe('Country Programs');
      expect(result[0].daysSinceActivity).toBeGreaterThanOrEqual(45);
    });

    it('should return empty array when no gaps', async () => {
      mockResourceCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const result = await insightsService.identifyContentGaps();

      expect(result).toEqual([]);
    });
  });

  describe('analyzeAIUsage', () => {
    it('should find hidden gems', async () => {
      const avgClicksMock = [{ avgClicks: 20 }];

      const hiddenGemsMock = [
        {
          _id: new ObjectId(),
          title: 'Data Quality Checklist',
          aiCitations: 47,
          clicks: 12,
          citationToClickRatio: 3.92,
          category: 'Tools',
        },
      ];

      const mostCitedMock = [
        {
          _id: new ObjectId(),
          title: 'Implementation Guide',
          aiCitations: 100,
          category: 'Guidance',
        },
      ];

      const citationsByThemeMock = [
        { _id: 'Tools', citations: 47 },
        { _id: 'Guidance', citations: 100 },
      ];

      const totalCitationsMock = [{ total: 200 }];

      mockResourceCollection.aggregate
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(avgClicksMock) })
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(hiddenGemsMock) })
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(mostCitedMock) })
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(citationsByThemeMock) })
        .mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue(totalCitationsMock) });

      const result = await insightsService.analyzeAIUsage();

      expect(result.hiddenGems.length).toBeGreaterThan(0);
      expect(result.hiddenGems[0].citationToClickRatio).toBeCloseTo(3.92, 1);
      expect(result.mostCited.length).toBeGreaterThan(0);
      expect(result.totalAICitations).toBe(200);
    });
  });

  describe('generateWeeklyReport', () => {
    it('should generate complete report', async () => {
      // Mock all sub-methods data
      const emptyArray: any[] = [];
      mockResourceCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(emptyArray),
      });

      const result = await insightsService.generateWeeklyReport();

      expect(result.weekRange).toBeDefined();
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.executiveSummary).toBeDefined();
      expect(result.engagement).toBeDefined();
      expect(result.contentGaps).toBeDefined();
      expect(result.aiUsage).toBeDefined();
      expect(result.actionItems).toBeDefined();
    });

    it('should include week range in correct format', async () => {
      mockResourceCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const result = await insightsService.generateWeeklyReport();

      // Week range should be like "Nov 25 - Dec 1, 2024"
      expect(result.weekRange).toMatch(/\w+ \d+ - \w+ \d+, \d{4}/);
    });
  });

  describe('getAdminRecipients', () => {
    it('should fetch admin users', async () => {
      const adminUsers = [
        { email: 'admin1@example.com', name: 'Admin One' },
        { email: 'admin2@example.com', name: 'Admin Two' },
      ];

      mockUserCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(adminUsers),
      });

      const result = await insightsService.getAdminRecipients();

      expect(result.length).toBe(2);
      expect(result[0].email).toBe('admin1@example.com');
      expect(mockUserCollection.find).toHaveBeenCalledWith(
        { role: 'admin' },
        { projection: { email: 1, name: 1 } }
      );
    });

    it('should return empty array when no admins', async () => {
      mockUserCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const result = await insightsService.getAdminRecipients();

      expect(result).toEqual([]);
    });
  });
});
