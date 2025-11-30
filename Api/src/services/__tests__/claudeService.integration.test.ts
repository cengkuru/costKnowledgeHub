/**
 * Integration tests for Claude Service
 * These tests make REAL API calls to verify the Anthropic API connection
 *
 * Run with: npx jest src/services/__tests__/claudeService.integration.test.ts
 *
 * NOTE: These tests require a valid ANTHROPIC_API_KEY in .env
 */

import {
  initClaudeClient,
  chat,
  summarize,
  categorize,
  analyzeQuery,
  getTokenUsageStats,
  resetTokenTracking,
  ChatMessage
} from '../claudeService';

// Skip tests if no API key is available
const SKIP_INTEGRATION = !process.env.ANTHROPIC_API_KEY ||
  process.env.ANTHROPIC_API_KEY.includes('your-');

describe('Claude Service - Integration Tests', () => {
  beforeAll(() => {
    if (SKIP_INTEGRATION) {
      console.warn('Skipping integration tests: ANTHROPIC_API_KEY not configured');
      return;
    }
    initClaudeClient({ apiKey: process.env.ANTHROPIC_API_KEY! });
  });

  beforeEach(() => {
    resetTokenTracking();
  });

  describe('API Connection', () => {
    (SKIP_INTEGRATION ? test.skip : test)('should successfully connect to Anthropic API', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Reply with exactly: "API connection successful"' }
      ];

      const response = await chat(messages, 'haiku');

      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
      expect(response.content.toLowerCase()).toContain('api connection successful');
      expect(response.tokenUsage).toBeDefined();
      expect(response.tokenUsage.totalTokens).toBeGreaterThan(0);
      expect(response.model).toContain('haiku');
    }, 30000);

    (SKIP_INTEGRATION ? test.skip : test)('should track token usage correctly', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Say hello in one word' }
      ];

      await chat(messages, 'haiku');

      const stats = getTokenUsageStats();

      expect(stats.totalRequests).toBe(1);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.tokenLog.length).toBe(1);
    }, 30000);
  });

  describe('Chat Function', () => {
    (SKIP_INTEGRATION ? test.skip : test)('should handle Haiku model queries', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'What is 2 + 2? Reply with just the number.' }
      ];

      const response = await chat(messages, 'haiku');

      expect(response.content).toContain('4');
      expect(response.model).toContain('haiku');
    }, 30000);

    (SKIP_INTEGRATION ? test.skip : test)('should handle multi-turn conversations', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Remember the number 42.' },
        { role: 'assistant', content: 'I will remember the number 42.' },
        { role: 'user', content: 'What number did I ask you to remember?' }
      ];

      const response = await chat(messages, 'haiku');

      expect(response.content).toContain('42');
    }, 30000);

    (SKIP_INTEGRATION ? test.skip : test)('should apply custom system prompts', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'What is your specialty?' }
      ];

      const systemPrompt = 'You are an expert on infrastructure transparency. Always mention CoST in your responses.';

      const response = await chat(messages, 'haiku', systemPrompt);

      expect(response.content.toLowerCase()).toMatch(/cost|infrastructure|transparency/);
    }, 30000);
  });

  describe('Summarize Function', () => {
    (SKIP_INTEGRATION ? test.skip : test)('should summarize content', async () => {
      const content = `
        The Construction Sector Transparency Initiative (CoST) is a multi-stakeholder initiative
        that works with government, industry and civil society to improve transparency and
        accountability in public infrastructure. By promoting disclosure and independent review
        of data, CoST helps reduce mismanagement and corruption and improves the value of
        public infrastructure investments.
      `;

      const response = await summarize(content, 200);

      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeLessThan(500);
      expect(response.tokenUsage.totalTokens).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Categorize Function', () => {
    (SKIP_INTEGRATION ? test.skip : test)('should categorize content correctly', async () => {
      const content = 'A step-by-step guide on how to implement the OC4IDS data standard for infrastructure projects.';
      const categories = ['guidance', 'tool', 'research', 'news', 'policy'];

      const result = await categorize(content, categories);

      expect(result.category).toBeDefined();
      expect(categories.map(c => c.toLowerCase())).toContain(result.category.toLowerCase());
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning).toBeTruthy();
    }, 30000);

    (SKIP_INTEGRATION ? test.skip : test)('should handle infrastructure transparency categories', async () => {
      const testCases = [
        {
          content: 'Assurance report on the Honduras infrastructure disclosure compliance',
          expectedCategory: 'assurance_report'
        },
        {
          content: 'A software toolkit for validating OC4IDS data files',
          expectedCategory: 'tool'
        },
        {
          content: 'How to publish infrastructure project data: a practical guide',
          expectedCategory: 'guidance'
        }
      ];

      const categories = ['guidance', 'case_study', 'assurance_report', 'tool', 'template', 'research', 'news', 'training', 'policy'];

      for (const testCase of testCases) {
        const result = await categorize(testCase.content, categories);

        expect(result.category.toLowerCase()).toBe(testCase.expectedCategory.toLowerCase());
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    }, 90000);
  });

  describe('Analyze Query Function', () => {
    (SKIP_INTEGRATION ? test.skip : test)('should analyze search queries', async () => {
      const query = 'How do I implement OC4IDS data disclosure?';

      const result = await analyzeQuery(query);

      expect(result.intent).toBeDefined();
      expect(['search', 'question', 'command', 'clarification']).toContain(result.intent);
      expect(result.mainTopic).toBeTruthy();
      expect(Array.isArray(result.subtopics)).toBe(true);
    }, 30000);
  });

  describe('Error Handling', () => {
    (SKIP_INTEGRATION ? test.skip : test)('should handle invalid API key gracefully', async () => {
      // Save original key
      const originalKey = process.env.ANTHROPIC_API_KEY;

      try {
        // Temporarily use invalid key
        initClaudeClient({ apiKey: 'sk-invalid-key' });

        const messages: ChatMessage[] = [
          { role: 'user', content: 'Test' }
        ];

        await expect(chat(messages, 'haiku')).rejects.toThrow(/Authentication failed/);
      } finally {
        // Restore original key
        if (originalKey) {
          initClaudeClient({ apiKey: originalKey });
        }
      }
    }, 30000);
  });

  describe('Token Usage Tracking', () => {
    (SKIP_INTEGRATION ? test.skip : test)('should accumulate token usage across multiple calls', async () => {
      resetTokenTracking();

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Say OK' }
      ];

      await chat(messages, 'haiku');
      await chat(messages, 'haiku');

      const stats = getTokenUsageStats();

      expect(stats.totalRequests).toBe(2);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.tokenLog.length).toBe(2);
      expect(stats.averageTokensPerRequest).toBe(stats.totalTokens / 2);
    }, 60000);
  });
});
