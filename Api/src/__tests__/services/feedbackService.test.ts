import { ObjectId } from 'mongodb';
import { feedbackService } from '../../services/feedbackService';
import { db } from '../../config/database';
import { FEEDBACK_COLLECTION } from '../../models/ChatFeedback';

// Mock database setup
jest.mock('../../config/database', () => ({
  db: {
    collection: jest.fn()
  }
}));

describe('FeedbackService', () => {
  let mockCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn(),
      aggregate: jest.fn()
    };

    (db.collection as jest.Mock).mockReturnValue(mockCollection);
  });

  describe('submitFeedback', () => {
    it('should submit feedback with rating and text', async () => {
      const responseId = new ObjectId();
      const sessionId = 'session-123';
      const userId = new ObjectId();
      const feedback = { rating: 'helpful' as const, feedbackText: 'Great response' };

      const insertResult = { insertedId: new ObjectId() };
      mockCollection.insertOne.mockResolvedValue(insertResult);

      const result = await feedbackService.submitFeedback(
        responseId,
        sessionId,
        feedback,
        userId
      );

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result._id).toBe(insertResult.insertedId);
      expect(result.rating).toBe('helpful');
      expect(result.feedbackText).toBe('Great response');
    });

    it('should handle string IDs by converting to ObjectId', async () => {
      const responseIdStr = new ObjectId().toString();
      const sessionId = 'session-123';
      const feedback = { rating: 'not_helpful' as const };

      const insertResult = { insertedId: new ObjectId() };
      mockCollection.insertOne.mockResolvedValue(insertResult);

      const result = await feedbackService.submitFeedback(
        responseIdStr,
        sessionId,
        feedback
      );

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result.rating).toBe('not_helpful');
    });

    it('should submit feedback without explicit rating', async () => {
      const responseId = new ObjectId();
      const sessionId = 'session-123';
      const feedback = {};

      const insertResult = { insertedId: new ObjectId() };
      mockCollection.insertOne.mockResolvedValue(insertResult);

      const result = await feedbackService.submitFeedback(responseId, sessionId, feedback);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result.rating).toBeNull();
    });

    it('should reject feedback with invalid sessionId', async () => {
      const responseId = new ObjectId();
      const feedback = { rating: 'helpful' as const };

      await expect(
        feedbackService.submitFeedback(responseId, '', feedback)
      ).rejects.toThrow();
    });
  });

  describe('trackCitationClick', () => {
    it('should track citation click', async () => {
      const responseId = new ObjectId();
      const feedbackDoc = { _id: new ObjectId(), responseId };

      mockCollection.findOne.mockResolvedValue(feedbackDoc);
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await feedbackService.trackCitationClick(responseId);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: feedbackDoc._id },
        expect.objectContaining({ $set: expect.objectContaining({ citationClicked: true }) })
      );
    });

    it('should handle string response ID', async () => {
      const responseIdStr = new ObjectId().toString();
      const feedbackDoc = { _id: new ObjectId() };

      mockCollection.findOne.mockResolvedValue(feedbackDoc);
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await feedbackService.trackCitationClick(responseIdStr);

      expect(mockCollection.updateOne).toHaveBeenCalled();
    });
  });

  describe('trackCopyClick', () => {
    it('should track copy click', async () => {
      const responseId = new ObjectId();
      const feedbackDoc = { _id: new ObjectId() };

      mockCollection.findOne.mockResolvedValue(feedbackDoc);
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await feedbackService.trackCopyClick(responseId);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: feedbackDoc._id },
        expect.objectContaining({ $set: expect.objectContaining({ copyClicked: true }) })
      );
    });
  });

  describe('trackFollowUp', () => {
    it('should track follow-up question', async () => {
      const responseId = new ObjectId();
      const feedbackDoc = { _id: new ObjectId() };

      mockCollection.findOne.mockResolvedValue(feedbackDoc);
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await feedbackService.trackFollowUp(responseId);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: feedbackDoc._id },
        expect.objectContaining({ $set: expect.objectContaining({ followUpAsked: true }) })
      );
    });
  });

  describe('getFeedbackStats', () => {
    it('should calculate feedback statistics', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      const aggregateResult = [
        {
          summary: [
            {
              totalCount: 100,
              helpfulCount: 75,
              notHelpfulCount: 25,
              citationsClicked: 50,
              copyClicked: 60
            }
          ],
          feedback: [
            { feedbackText: 'Great accuracy' },
            { feedbackText: 'Missing information' }
          ]
        }
      ];

      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(aggregateResult)
      });

      const stats = await feedbackService.getFeedbackStats({ from, to });

      expect(stats.totalResponses).toBe(100);
      expect(stats.helpfulCount).toBe(75);
      expect(stats.notHelpfulCount).toBe(25);
      expect(stats.helpfulnessRate).toBe(0.75);
      expect(stats.avgCitationsClicked).toBeCloseTo(0.5, 1);
      expect(stats.avgCopyClicked).toBeCloseTo(0.6, 1);
    });

    it('should reject invalid time period', async () => {
      const from = new Date('2024-01-31');
      const to = new Date('2024-01-01');

      await expect(
        feedbackService.getFeedbackStats({ from, to })
      ).rejects.toThrow('Invalid time period');
    });

    it('should return zero stats for empty period', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      const aggregateResult = [
        {
          summary: [],
          feedback: []
        }
      ];

      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(aggregateResult)
      });

      const stats = await feedbackService.getFeedbackStats({ from, to });

      expect(stats.totalResponses).toBe(0);
      expect(stats.helpfulnessRate).toBe(0);
    });
  });

  describe('getFeedbackForResponse', () => {
    it('should retrieve feedback for a response', async () => {
      const responseId = new ObjectId();
      const feedbackDoc = {
        _id: new ObjectId(),
        responseId,
        rating: 'helpful',
        sessionId: 'session-123'
      };

      mockCollection.findOne.mockResolvedValue(feedbackDoc);

      const result = await feedbackService.getFeedbackForResponse(responseId);

      expect(result).toEqual(feedbackDoc);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ responseId });
    });

    it('should return null if no feedback found', async () => {
      const responseId = new ObjectId();
      mockCollection.findOne.mockResolvedValue(null);

      const result = await feedbackService.getFeedbackForResponse(responseId);

      expect(result).toBeNull();
    });
  });

  describe('getRecentFeedback', () => {
    it('should handle retrieval of recent feedback', async () => {
      // Note: This test verifies the method exists and handles errors gracefully
      // Detailed mocking of MongoDB cursor chains is done in integration tests
      const feedbackItems = [
        { _id: new ObjectId(), rating: 'helpful' }
      ];

      const toArrayMock = jest.fn().mockResolvedValue(feedbackItems);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
      const findMock = jest.fn().mockReturnValue({ sort: sortMock });

      mockCollection.find = findMock;

      const result = await feedbackService.getRecentFeedback(1);

      expect(result).toEqual(feedbackItems);
    });
  });
});
