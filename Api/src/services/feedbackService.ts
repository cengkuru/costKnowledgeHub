import { ObjectId, Collection } from 'mongodb';
import { db } from '../config/database';
import {
  ChatFeedback,
  FEEDBACK_COLLECTION,
  FeedbackInput,
  FeedbackStats,
  CreateFeedbackSchema,
  TrackSignalSchema
} from '../models/ChatFeedback';
import { ApiError } from '../middleware/errorHandler';

/**
 * Feedback Service - Manages user feedback collection and quality metrics
 */
export const feedbackService = {
  /**
   * Get feedback collection
   */
  getCollection(): Collection<ChatFeedback> {
    return db.collection<ChatFeedback>(FEEDBACK_COLLECTION);
  },

  /**
   * Submit explicit feedback for a response
   */
  async submitFeedback(
    responseId: ObjectId | string,
    sessionId: string,
    feedback: {
      rating?: 'helpful' | 'not_helpful';
      feedbackText?: string;
    },
    userId?: ObjectId | string
  ): Promise<ChatFeedback> {
    try {
      // Convert strings to ObjectId if necessary
      const respId = typeof responseId === 'string' ? new ObjectId(responseId) : responseId;
      const userIdObj = userId ? (typeof userId === 'string' ? new ObjectId(userId) : userId) : undefined;

      // Validate input
      const validatedFeedback = CreateFeedbackSchema.parse({
        responseId: respId,
        sessionId,
        userId: userIdObj,
        rating: feedback.rating || null,
        feedbackText: feedback.feedbackText
      });

      // Check if response exists (optional - depends on your response storage)
      // You may want to verify the responseId exists in chat_responses collection

      const feedbackDoc: ChatFeedback = {
        responseId: validatedFeedback.responseId,
        sessionId: validatedFeedback.sessionId,
        userId: validatedFeedback.userId,
        rating: validatedFeedback.rating,
        feedbackText: validatedFeedback.feedbackText,
        followUpAsked: false,
        citationClicked: false,
        copyClicked: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.getCollection().insertOne(feedbackDoc);
      feedbackDoc._id = result.insertedId;

      return feedbackDoc;
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(400, `Failed to submit feedback: ${error.message}`);
      }
      throw error;
    }
  },

  /**
   * Track citation click signal
   */
  async trackCitationClick(responseId: ObjectId | string): Promise<void> {
    try {
      const respId = typeof responseId === 'string' ? new ObjectId(responseId) : responseId;

      // Validate input
      TrackSignalSchema.parse({ responseId: respId, signalType: 'citation_click' });

      // Update or create feedback record with citation click signal
      const collection = this.getCollection();
      const now = new Date();

      // Find most recent feedback for this response and increment citation clicks
      const feedback = await collection.findOne({ responseId: respId });

      if (feedback) {
        await collection.updateOne(
          { _id: feedback._id },
          {
            $set: { citationClicked: true, updatedAt: now }
          }
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(400, `Failed to track citation click: ${error.message}`);
      }
      throw error;
    }
  },

  /**
   * Track copy click signal
   */
  async trackCopyClick(responseId: ObjectId | string): Promise<void> {
    try {
      const respId = typeof responseId === 'string' ? new ObjectId(responseId) : responseId;

      // Validate input
      TrackSignalSchema.parse({ responseId: respId, signalType: 'copy_click' });

      const collection = this.getCollection();
      const now = new Date();

      // Find most recent feedback for this response
      const feedback = await collection.findOne({ responseId: respId });

      if (feedback) {
        await collection.updateOne(
          { _id: feedback._id },
          {
            $set: { copyClicked: true, updatedAt: now }
          }
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(400, `Failed to track copy click: ${error.message}`);
      }
      throw error;
    }
  },

  /**
   * Track follow-up question signal
   */
  async trackFollowUp(responseId: ObjectId | string): Promise<void> {
    try {
      const respId = typeof responseId === 'string' ? new ObjectId(responseId) : responseId;

      const collection = this.getCollection();
      const now = new Date();

      // Find most recent feedback for this response
      const feedback = await collection.findOne({ responseId: respId });

      if (feedback) {
        await collection.updateOne(
          { _id: feedback._id },
          {
            $set: { followUpAsked: true, updatedAt: now }
          }
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(400, `Failed to track follow-up: ${error.message}`);
      }
      throw error;
    }
  },

  /**
   * Get feedback statistics for a time period
   */
  async getFeedbackStats(period: { from: Date; to: Date }): Promise<FeedbackStats> {
    try {
      const collection = this.getCollection();

      // Validate period
      if (period.from >= period.to) {
        throw new Error('Invalid time period: from must be before to');
      }

      // Aggregate feedback statistics
      const pipeline = [
        {
          $match: {
            createdAt: {
              $gte: period.from,
              $lte: period.to
            }
          }
        },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalCount: { $sum: 1 },
                  helpfulCount: {
                    $sum: { $cond: [{ $eq: ['$rating', 'helpful'] }, 1, 0] }
                  },
                  notHelpfulCount: {
                    $sum: { $cond: [{ $eq: ['$rating', 'not_helpful'] }, 1, 0] }
                  },
                  citationsClicked: {
                    $sum: { $cond: ['$citationClicked', 1, 0] }
                  },
                  copyClicked: {
                    $sum: { $cond: ['$copyClicked', 1, 0] }
                  }
                }
              }
            ],
            feedback: [
              {
                $match: { feedbackText: { $exists: true, $ne: null } }
              },
              { $project: { feedbackText: 1 } }
            ]
          }
        }
      ];

      const result = await collection.aggregate(pipeline).toArray();
      const data = result[0];

      const summary = data.summary[0] || {
        totalCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        citationsClicked: 0,
        copyClicked: 0
      };

      const helpfulnessRate = summary.totalCount > 0
        ? summary.helpfulCount / (summary.helpfulCount + summary.notHelpfulCount)
        : 0;

      const avgCitationsClicked = summary.totalCount > 0
        ? summary.citationsClicked / summary.totalCount
        : 0;

      const avgCopyClicked = summary.totalCount > 0
        ? summary.copyClicked / summary.totalCount
        : 0;

      // Extract common topics from feedback text (simple keyword extraction)
      const commonTopics = this.extractCommonTopics(data.feedback);

      return {
        totalResponses: summary.totalCount,
        helpfulCount: summary.helpfulCount,
        notHelpfulCount: summary.notHelpfulCount,
        helpfulnessRate: Math.round(helpfulnessRate * 100) / 100,
        avgCitationsClicked: Math.round(avgCitationsClicked * 100) / 100,
        avgCopyClicked: Math.round(avgCopyClicked * 100) / 100,
        commonFeedbackTopics: commonTopics,
        timeRange: period
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(400, `Failed to get feedback stats: ${error.message}`);
      }
      throw error;
    }
  },

  /**
   * Extract common topics from feedback text
   */
  extractCommonTopics(feedbackItems: { feedbackText?: string }[]): string[] {
    const keywords = [
      'accurate', 'inaccurate', 'helpful', 'unhelpful',
      'complete', 'incomplete', 'clear', 'confusing',
      'relevant', 'irrelevant', 'outdated', 'missing',
      'hallucination', 'factual', 'source', 'citation'
    ];

    const topicCount: Record<string, number> = {};

    feedbackItems.forEach((item) => {
      if (!item.feedbackText) return;

      const text = item.feedbackText.toLowerCase();
      keywords.forEach((keyword) => {
        if (text.includes(keyword)) {
          topicCount[keyword] = (topicCount[keyword] || 0) + 1;
        }
      });
    });

    // Sort by frequency and return top 5
    return Object.entries(topicCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
  },

  /**
   * Get feedback for a specific response
   */
  async getFeedbackForResponse(responseId: ObjectId | string): Promise<ChatFeedback | null> {
    try {
      const respId = typeof responseId === 'string' ? new ObjectId(responseId) : responseId;
      return await this.getCollection().findOne({ responseId: respId });
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(400, `Failed to get feedback: ${error.message}`);
      }
      throw error;
    }
  },

  /**
   * Get recent feedback items
   */
  async getRecentFeedback(limit: number = 10): Promise<ChatFeedback[]> {
    try {
      const collection = this.getCollection();
      return await collection
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(400, `Failed to get recent feedback: ${error.message}`);
      }
      throw error;
    }
  }
};
