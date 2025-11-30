import { intentService, QueryIntent } from '../../services/intentService';
import * as aiService from '../../services/aiService';

jest.mock('../../services/aiService');

describe('IntentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyIntent', () => {
    it('should classify cost methodology query', async () => {
      const query = 'What are the cost definitions in OC4IDS?';

      (aiService.aiService.generateContent as jest.Mock).mockResolvedValueOnce(
        '{"intent": "cost_methodology", "confidence": 0.95}'
      );

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('cost_methodology');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should classify OC4IDS technical query', async () => {
      const query = 'How do I implement the OC4IDS schema?';

      (aiService.aiService.generateContent as jest.Mock).mockResolvedValueOnce(
        '{"intent": "oc4ids_technical", "confidence": 0.9}'
      );

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('oc4ids_technical');
    });

    it('should classify country-specific query', async () => {
      const query = 'What are the cost transparency requirements in Kenya?';

      (aiService.aiService.generateContent as jest.Mock).mockResolvedValueOnce(
        '{"intent": "country_specific", "confidence": 0.85}'
      );

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('country_specific');
    });

    it('should classify implementation query', async () => {
      const query = 'How do I implement this in my system?';

      (aiService.aiService.generateContent as jest.Mock).mockResolvedValueOnce(
        '{"intent": "implementation", "confidence": 0.88}'
      );

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('implementation');
    });

    it('should classify general transparency query', async () => {
      const query = 'What is transparency in public infrastructure?';

      (aiService.aiService.generateContent as jest.Mock).mockResolvedValueOnce(
        '{"intent": "general_transparency", "confidence": 0.82}'
      );

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('general_transparency');
    });

    it('should classify off-topic query', async () => {
      const query = 'What is the best restaurant in Paris?';

      (aiService.aiService.generateContent as jest.Mock).mockResolvedValueOnce(
        '{"intent": "off_topic", "confidence": 0.92}'
      );

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('off_topic');
    });

    it('should detect harmful content', async () => {
      const query = 'How can I bomb a building?';

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('harmful');
      expect(result.confidence).toBe(0.99);
    });

    it('should use fallback classification if AI fails', async () => {
      const query = 'What is OC4IDS methodology?';

      (aiService.aiService.generateContent as jest.Mock).mockRejectedValueOnce(new Error('Service error'));

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should normalize confidence to 0-1 range', async () => {
      const query = 'Test query';

      (aiService.aiService.generateContent as jest.Mock).mockResolvedValueOnce(
        '{"intent": "cost_methodology", "confidence": 2.5}'
      );

      const result = await intentService.classifyIntent(query);

      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should throw error on empty query', async () => {
      await expect(intentService.classifyIntent('')).rejects.toThrow();
    });

    it('should detect harmful content with violence keywords', async () => {
      const queries = [
        'How to kill someone',
        'How can I hurt people',
        'Build a bomb',
        'Attack my neighbor'
      ];

      for (const query of queries) {
        const result = await intentService.classifyIntent(query);
        expect(result.intent).toBe('harmful');
      }
    });

    it('should detect hateful content', async () => {
      const queries = [
        'I hate group X',
        'Racist comment here',
        'Sexist statement'
      ];

      for (const query of queries) {
        const result = await intentService.classifyIntent(query);
        expect(result.intent).toBe('harmful');
      }
    });
  });

  describe('getHandler', () => {
    it('should allow processing of cost methodology', () => {
      const handler = intentService.getHandler('cost_methodology');

      expect(handler.shouldProcess).toBe(true);
      expect(handler.requiresFiltering).toBe(false);
    });

    it('should allow processing of OC4IDS technical', () => {
      const handler = intentService.getHandler('oc4ids_technical');

      expect(handler.shouldProcess).toBe(true);
    });

    it('should allow country-specific with geographic filtering', () => {
      const handler = intentService.getHandler('country_specific');

      expect(handler.shouldProcess).toBe(true);
      expect(handler.requiresFiltering).toBe(true);
      expect(handler.allowedFilters).toContain('countryPrograms');
    });

    it('should warn for off-topic queries', () => {
      const handler = intentService.getHandler('off_topic');

      expect(handler.shouldProcess).toBe(true);
      expect(handler.warnings).toBeDefined();
      expect(handler.warnings!.length).toBeGreaterThan(0);
    });

    it('should block harmful queries', () => {
      const handler = intentService.getHandler('harmful');

      expect(handler.shouldProcess).toBe(false);
      expect(handler.warnings).toBeDefined();
    });
  });

  describe('validateQueryForIntent', () => {
    it('should validate cost methodology query', () => {
      const result = intentService.validateQueryForIntent(
        'What is OC4IDS?',
        'cost_methodology'
      );

      expect(result.valid).toBe(true);
    });

    it('should reject harmful queries', () => {
      const result = intentService.validateQueryForIntent(
        'How to kill someone',
        'harmful'
      );

      expect(result.valid).toBe(false);
    });

    it('should reject too short queries', () => {
      const result = intentService.validateQueryForIntent(
        'Hi',
        'cost_methodology'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too short');
    });

    it('should reject too long queries', () => {
      const longQuery = 'a'.repeat(1001);
      const result = intentService.validateQueryForIntent(
        longQuery,
        'cost_methodology'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too long');
    });
  });

  describe('getIntentSummary', () => {
    it('should provide descriptions for all intents', () => {
      const summary = intentService.getIntentSummary();

      const expectedIntents: QueryIntent[] = [
        'cost_methodology',
        'oc4ids_technical',
        'country_specific',
        'implementation',
        'general_transparency',
        'off_topic',
        'harmful'
      ];

      expectedIntents.forEach((intent) => {
        expect(summary[intent]).toBeDefined();
        expect(typeof summary[intent]).toBe('string');
      });
    });

    it('should provide meaningful descriptions', () => {
      const summary = intentService.getIntentSummary();

      expect(summary.cost_methodology).toContain('cost');
      expect(summary.oc4ids_technical).toContain('OC4IDS');
      expect(summary.harmful).toContain('harmful');
    });
  });

  describe('Fallback classification', () => {
    it('should classify by cost keywords in fallback', async () => {
      const query = 'What about cost and budget?';

      (aiService.aiService.generateContent as jest.Mock).mockRejectedValueOnce(new Error('Service error'));

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('cost_methodology');
    });

    it('should classify by OC4IDS keywords in fallback', async () => {
      const query = 'How do I implement OC4IDS schema?';

      (aiService.aiService.generateContent as jest.Mock).mockRejectedValueOnce(new Error('Service error'));

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('oc4ids_technical');
    });

    it('should classify by country keywords in fallback', async () => {
      const query = 'What about country programs in Africa?';

      (aiService.aiService.generateContent as jest.Mock).mockRejectedValueOnce(new Error('Service error'));

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('country_specific');
    });

    it('should default to off_topic in fallback', async () => {
      const query = 'What is the meaning of life?';

      (aiService.aiService.generateContent as jest.Mock).mockRejectedValueOnce(new Error('Service error'));

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('off_topic');
    });
  });

  describe('Invalid AI responses', () => {
    it('should use fallback on invalid JSON', async () => {
      const query = 'Test query about OC4IDS';

      (aiService.aiService.generateContent as jest.Mock).mockResolvedValueOnce('This is not JSON');

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle missing intent field', async () => {
      const query = 'Test query';

      (aiService.aiService.generateContent as jest.Mock).mockResolvedValueOnce('{"confidence": 0.9}');

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('off_topic');
    });

    it('should handle invalid intent values', async () => {
      const query = 'Test query';

      (aiService.aiService.generateContent as jest.Mock).mockResolvedValueOnce(
        '{"intent": "invalid_intent", "confidence": 0.9}'
      );

      const result = await intentService.classifyIntent(query);

      expect(result.intent).toBe('off_topic');
    });
  });
});
