import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import express from 'express';
import chatRouter from '../../routes/chat';
import * as feedbackService from '../../services/feedbackService';
import * as faithfulnessService from '../../services/faithfulnessService';
import * as intentService from '../../services/intentService';

// Mock services
jest.mock('../../services/feedbackService');
jest.mock('../../services/faithfulnessService');
jest.mock('../../services/intentService');
jest.mock('../../services/ragService');

describe('Chat Routes - Feedback Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/chat', chatRouter);
  });

  describe('POST /api/chat/:responseId/feedback', () => {
    it('should submit feedback with rating', async () => {
      const responseId = new ObjectId();
      const mockFeedback = {
        _id: new ObjectId(),
        responseId,
        sessionId: 'session-123',
        rating: 'helpful' as const,
        feedbackText: 'Great response',
        followUpAsked: false,
        citationClicked: false,
        copyClicked: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (feedbackService.feedbackService.submitFeedback as jest.Mock).mockResolvedValueOnce(
        mockFeedback
      );

      const response = await request(app)
        .post(`/api/chat/${responseId}/feedback`)
        .send({
          sessionId: 'session-123',
          rating: 'helpful',
          feedbackText: 'Great response'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.feedbackId).toBe(mockFeedback._id.toString());
    });

    it('should submit feedback without rating', async () => {
      const responseId = new ObjectId();
      const mockFeedback = {
        _id: new ObjectId(),
        responseId,
        sessionId: 'session-123',
        rating: null,
        feedbackText: 'Needs improvement',
        followUpAsked: false,
        citationClicked: false,
        copyClicked: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (feedbackService.feedbackService.submitFeedback as jest.Mock).mockResolvedValueOnce(
        mockFeedback
      );

      const response = await request(app)
        .post(`/api/chat/${responseId}/feedback`)
        .send({
          sessionId: 'session-123',
          feedbackText: 'Needs improvement'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid response ID', async () => {
      const response = await request(app)
        .post('/api/chat/invalid-id/feedback')
        .send({
          sessionId: 'session-123',
          rating: 'helpful'
        });

      expect(response.status).toBe(400);
    });

    it('should reject missing sessionId', async () => {
      const responseId = new ObjectId();

      const response = await request(app)
        .post(`/api/chat/${responseId}/feedback`)
        .send({
          rating: 'helpful'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/chat/:responseId/track', () => {
    it('should track citation click', async () => {
      const responseId = new ObjectId();

      (feedbackService.feedbackService.trackCitationClick as jest.Mock).mockResolvedValueOnce(
        undefined
      );

      const response = await request(app)
        .post(`/api/chat/${responseId}/track`)
        .send({
          signalType: 'citation_click'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(feedbackService.feedbackService.trackCitationClick).toHaveBeenCalledWith(responseId);
    });

    it('should track copy click', async () => {
      const responseId = new ObjectId();

      (feedbackService.feedbackService.trackCopyClick as jest.Mock).mockResolvedValueOnce(
        undefined
      );

      const response = await request(app)
        .post(`/api/chat/${responseId}/track`)
        .send({
          signalType: 'copy_click'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(feedbackService.feedbackService.trackCopyClick).toHaveBeenCalledWith(responseId);
    });

    it('should track follow-up', async () => {
      const responseId = new ObjectId();

      (feedbackService.feedbackService.trackFollowUp as jest.Mock).mockResolvedValueOnce(
        undefined
      );

      const response = await request(app)
        .post(`/api/chat/${responseId}/track`)
        .send({
          signalType: 'follow_up'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(feedbackService.feedbackService.trackFollowUp).toHaveBeenCalledWith(responseId);
    });

    it('should reject invalid signal type', async () => {
      const responseId = new ObjectId();

      const response = await request(app)
        .post(`/api/chat/${responseId}/track`)
        .send({
          signalType: 'invalid_signal'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/chat/feedback/stats', () => {
    it('should get feedback statistics', async () => {
      const mockStats = {
        totalResponses: 100,
        helpfulCount: 75,
        notHelpfulCount: 25,
        helpfulnessRate: 0.75,
        avgCitationsClicked: 0.5,
        avgCopyClicked: 0.6,
        commonFeedbackTopics: ['accurate', 'helpful', 'clear'],
        timeRange: {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31')
        }
      };

      (feedbackService.feedbackService.getFeedbackStats as jest.Mock).mockResolvedValueOnce(
        mockStats
      );

      const response = await request(app).get('/api/chat/feedback/stats');

      expect(response.status).toBe(200);
      expect(response.body.totalResponses).toBe(100);
      expect(response.body.helpfulnessRate).toBe(0.75);
    });

    it('should use custom date range', async () => {
      const mockStats = {
        totalResponses: 50,
        helpfulCount: 40,
        notHelpfulCount: 10,
        helpfulnessRate: 0.8,
        avgCitationsClicked: 0.4,
        avgCopyClicked: 0.5,
        commonFeedbackTopics: [],
        timeRange: {
          from: new Date('2024-01-15'),
          to: new Date('2024-01-20')
        }
      };

      (feedbackService.feedbackService.getFeedbackStats as jest.Mock).mockResolvedValueOnce(
        mockStats
      );

      const response = await request(app)
        .get('/api/chat/feedback/stats')
        .query({
          from: '2024-01-15T00:00:00Z',
          to: '2024-01-20T00:00:00Z'
        });

      expect(response.status).toBe(200);
      expect(response.body.totalResponses).toBe(50);
    });
  });

  describe('POST /api/chat/:responseId/verify', () => {
    it('should verify faithfulness', async () => {
      const responseId = new ObjectId();
      const mockResult = {
        score: 0.85,
        claims: [
          { statement: 'OC4IDS is a standard', supported: true, confidence: 0.9 }
        ],
        unsupportedClaims: [],
        confidence: 'high' as const,
        reasoning: 'High faithfulness'
      };

      (faithfulnessService.faithfulnessService.verifyFaithfulness as jest.Mock).mockResolvedValueOnce(
        mockResult
      );

      const response = await request(app)
        .post(`/api/chat/${responseId}/verify`)
        .send({
          answer: 'OC4IDS is a standard for cost transparency',
          sources: [
            { content: 'OC4IDS defines cost structures for infrastructure projects' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.score).toBe(0.85);
      expect(response.body.confidence).toBe('high');
    });

    it('should detect hallucinations', async () => {
      const responseId = new ObjectId();
      const mockResult = {
        score: 0.2,
        claims: [
          { statement: 'The moon is made of cheese', supported: false, confidence: 0.8 }
        ],
        unsupportedClaims: ['The moon is made of cheese'],
        confidence: 'hallucination' as const,
        reasoning: 'Major hallucinations detected'
      };

      (faithfulnessService.faithfulnessService.verifyFaithfulness as jest.Mock).mockResolvedValueOnce(
        mockResult
      );

      const response = await request(app)
        .post(`/api/chat/${responseId}/verify`)
        .send({
          answer: 'The moon is made of cheese',
          sources: [
            { content: 'The moon is a natural satellite of Earth' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.confidence).toBe('hallucination');
      expect(response.body.unsupportedClaims.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/chat/classify-intent', () => {
    it('should classify cost methodology intent', async () => {
      const mockClassification = {
        intent: 'cost_methodology' as const,
        confidence: 0.95,
        reasoning: 'Query matches cost methodology keywords'
      };

      const mockHandler = {
        shouldProcess: true,
        requiresFiltering: false
      };

      (intentService.intentService.classifyIntent as jest.Mock).mockResolvedValueOnce(
        mockClassification
      );
      (intentService.intentService.getHandler as jest.Mock).mockReturnValueOnce(
        mockHandler
      );

      const response = await request(app)
        .post('/api/chat/classify-intent')
        .send({
          query: 'What are the cost definitions in OC4IDS?'
        });

      expect(response.status).toBe(200);
      expect(response.body.classification.intent).toBe('cost_methodology');
      expect(response.body.handler.shouldProcess).toBe(true);
    });

    it('should detect harmful intent', async () => {
      const mockClassification = {
        intent: 'harmful' as const,
        confidence: 0.99,
        reasoning: 'Query contains harmful content'
      };

      const mockHandler = {
        shouldProcess: false,
        requiresFiltering: true,
        warnings: ['Query contains potentially harmful content']
      };

      (intentService.intentService.classifyIntent as jest.Mock).mockResolvedValueOnce(
        mockClassification
      );
      (intentService.intentService.getHandler as jest.Mock).mockReturnValueOnce(
        mockHandler
      );

      const response = await request(app)
        .post('/api/chat/classify-intent')
        .send({
          query: 'How to bomb something?'
        });

      expect(response.status).toBe(200);
      expect(response.body.classification.intent).toBe('harmful');
      expect(response.body.handler.shouldProcess).toBe(false);
    });

    it('should reject empty query', async () => {
      const response = await request(app)
        .post('/api/chat/classify-intent')
        .send({
          query: ''
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/chat/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/chat/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('chat');
    });
  });
});
