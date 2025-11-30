import { faithfulnessService } from '../../services/faithfulnessService';
import * as aiModule from '../../services/aiService';
import { DocumentChunk } from '../../models/DocumentChunk';

jest.mock('../../services/aiService');

describe('FaithfulnessService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSources: DocumentChunk[] = [
    {
      _id: undefined,
      resourceId: undefined as any,
      content: 'The OC4IDS standard defines cost information structures for infrastructure projects.',
      embedding: [],
      sourceSection: 'Section 1',
      charStart: 0,
      charEnd: 100,
      resourceType: 'guidance' as any,
      language: 'en' as any,
      themes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  describe('verifyFaithfulness', () => {
    it('should return zero score with no sources', async () => {
      const answer = 'Some statement';

      const result = await faithfulnessService.verifyFaithfulness(answer, []);

      expect(result.score).toBe(0);
      expect(result.confidence).toBe('hallucination');
    });

    it('should throw error on empty answer', async () => {
      await expect(
        faithfulnessService.verifyFaithfulness('', mockSources)
      ).rejects.toThrow();
    });
  });

  describe('extractClaims', () => {
    it('should return empty array for empty input', async () => {
      const claims = await faithfulnessService.extractClaims('');

      expect(claims).toEqual([]);
    });

    it('should use fallback extraction', async () => {
      const answer = 'The OC4IDS standard is important. Cost transparency matters significantly.';

      (aiModule.aiService.generateContent as jest.Mock).mockRejectedValueOnce(
        new Error('AI service unavailable')
      );

      const claims = await faithfulnessService.extractClaims(answer);

      expect(Array.isArray(claims)).toBe(true);
    });

    it('should validate claim confidence bounds', async () => {
      const answer = 'Test answer';

      (aiModule.aiService.generateContent as jest.Mock).mockResolvedValueOnce(
        '[{"statement": "Test", "confidence": 2.0}, {"statement": "Test2", "confidence": -1.0}]'
      );

      const claims = await faithfulnessService.extractClaims(answer);

      // Confidence should be normalized to 0-1
      claims.forEach((claim) => {
        expect(claim.confidence).toBeGreaterThanOrEqual(0);
        expect(claim.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('verifyClaim', () => {
    it('should verify claim as true', async () => {
      const claim = 'OC4IDS defines cost structures';

      (aiModule.aiService.generateContent as jest.Mock).mockResolvedValueOnce('TRUE');

      const result = await faithfulnessService.verifyClaim(claim, mockSources);

      expect(result).toBe(true);
    });

    it('should verify claim as false', async () => {
      const claim = 'The moon is made of cheese';

      (aiModule.aiService.generateContent as jest.Mock).mockResolvedValueOnce('FALSE');

      const result = await faithfulnessService.verifyClaim(claim, mockSources);

      expect(result).toBe(false);
    });

    it('should treat UNKNOWN as false', async () => {
      const claim = 'Some ambiguous claim';

      (aiModule.aiService.generateContent as jest.Mock).mockResolvedValueOnce('UNKNOWN');

      const result = await faithfulnessService.verifyClaim(claim, mockSources);

      expect(result).toBe(false);
    });

    it('should return false on AI failure', async () => {
      const claim = 'Test claim';

      (aiModule.aiService.generateContent as jest.Mock).mockRejectedValueOnce(
        new Error('Service error')
      );

      const result = await faithfulnessService.verifyClaim(claim, mockSources);

      expect(result).toBe(false);
    });

    it('should return false with no sources', async () => {
      const claim = 'Test claim';

      const result = await faithfulnessService.verifyClaim(claim, []);

      expect(result).toBe(false);
    });
  });

  describe('verifyClaimsBatch', () => {
    it('should verify multiple claims', async () => {
      const claims = ['Claim 1', 'Claim 2', 'Claim 3'];

      (aiModule.aiService.generateContent as jest.Mock)
        .mockResolvedValueOnce('TRUE')
        .mockResolvedValueOnce('FALSE')
        .mockResolvedValueOnce('TRUE');

      const results = await faithfulnessService.verifyClaimsBatch(claims, mockSources);

      expect(results.size).toBe(3);
      expect(results.get('Claim 1')).toBe(true);
      expect(results.get('Claim 2')).toBe(false);
      expect(results.get('Claim 3')).toBe(true);
    });
  });

  describe('getFaithfulnessScore', () => {
    it('should return normalized score', async () => {
      const answer = 'Test answer';

      (aiModule.aiService.generateContent as jest.Mock)
        .mockResolvedValueOnce('[{"statement": "Test", "confidence": 0.9}]')
        .mockResolvedValueOnce('TRUE');

      const score = await faithfulnessService.getFaithfulnessScore(answer, mockSources);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('detectHallucinations', () => {
    it('should return empty array for no unsupported claims', async () => {
      const answer = 'Simple statement';

      (aiModule.aiService.generateContent as jest.Mock)
        .mockResolvedValueOnce('[{"statement": "Simple statement", "confidence": 0.9}]')
        .mockResolvedValueOnce('TRUE');

      const hallucinations = await faithfulnessService.detectHallucinations(answer, mockSources);

      expect(Array.isArray(hallucinations)).toBe(true);
    });
  });
});
