import {
  initClaudeClient,
  chat,
  summarize,
  categorize,
  analyzeQuery,
  streamChat,
  getTokenUsageStats,
  resetTokenTracking,
  batchProcess,
  ChatMessage
} from '../claudeService';

// Mock the Anthropic module
jest.mock('@anthropic-ai/sdk');

import Anthropic from '@anthropic-ai/sdk';

describe('Claude Service', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTokenTracking();
    process.env.ANTHROPIC_API_KEY = 'test-api-key-12345';

    // Create a mock client instance
    mockClient = {
      messages: {
        create: jest.fn(),
        stream: jest.fn()
      }
    };

    (Anthropic as unknown as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  // ============= Initialization Tests =============
  describe('initClaudeClient', () => {
    test('should initialize client with valid config', () => {
      expect(() => {
        initClaudeClient({ apiKey: 'test-key' });
      }).not.toThrow();
    });

    test('should throw error when apiKey is missing', () => {
      expect(() => {
        initClaudeClient({ apiKey: '' });
      }).toThrow('ANTHROPIC_API_KEY is required');
    });
  });

  // ============= Chat Function Tests =============
  describe('chat function', () => {
    beforeEach(() => {
      initClaudeClient({ apiKey: 'test-key' });
    });

    test('should successfully send chat message', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Hello, how can I help?' }],
        usage: { input_tokens: 10, output_tokens: 20 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello Claude!' }
      ];

      const result = await chat(messages, 'opus');

      expect(result.content).toBe('Hello, how can I help?');
      expect(result.tokenUsage.inputTokens).toBe(10);
      expect(result.tokenUsage.outputTokens).toBe(20);
      expect(result.tokenUsage.totalTokens).toBe(30);
      expect(result.model).toContain('opus');
    });

    test('should handle Haiku model for simple queries', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Quick response' }],
        usage: { input_tokens: 5, output_tokens: 10 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'What is 2+2?' }
      ];

      const result = await chat(messages, 'haiku');

      expect(result.model).toContain('haiku');
      expect(result.content).toBe('Quick response');
    });

    test('should handle multiple message conversation', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Response to conversation' }],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'What is infrastructure transparency?' },
        { role: 'assistant', content: 'It is a concept...' },
        { role: 'user', content: 'Can you explain further?' }
      ];

      const result = await chat(messages);

      expect(result.content).toBe('Response to conversation');
      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'What is infrastructure transparency?' }),
            expect.objectContaining({ role: 'assistant', content: 'It is a concept...' })
          ])
        })
      );
    });

    test('should apply custom system prompt', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Specialized response' }],
        usage: { input_tokens: 20, output_tokens: 15 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Help me with Python' }
      ];

      const customPrompt = 'You are an expert Python developer';

      await chat(messages, 'opus', customPrompt);

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: customPrompt
        })
      );
    });

    test('should throw error on empty messages array', async () => {
      await expect(chat([], 'opus')).rejects.toThrow('Messages array must not be empty');
    });

    test('should calculate token usage and cost correctly', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Response' }],
        usage: { input_tokens: 100, output_tokens: 200 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' }
      ];

      const result = await chat(messages, 'haiku');

      expect(result.tokenUsage.inputTokens).toBe(100);
      expect(result.tokenUsage.outputTokens).toBe(200);
      expect(result.tokenUsage.totalTokens).toBe(300);
      expect(result.tokenUsage.estimatedCost).toBeGreaterThan(0);
    });
  });

  // ============= Summarize Function Tests =============
  describe('summarize function', () => {
    beforeEach(() => {
      initClaudeClient({ apiKey: 'test-key' });
    });

    test('should summarize content successfully', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'This is a summary.' }],
        usage: { input_tokens: 30, output_tokens: 10 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...';
      const result = await summarize(content);

      expect(result.content).toContain('summary');
      expect(result.tokenUsage).toBeDefined();
    });

    test('should respect maxLength parameter', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Brief.' }],
        usage: { input_tokens: 25, output_tokens: 5 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const content = 'This is a long text that needs to be summarized.';
      await summarize(content, 100);

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('100')
        })
      );
    });

    test('should throw error on empty content', async () => {
      await expect(summarize('')).rejects.toThrow('Content to summarize is required');
    });

    test('should throw error on whitespace-only content', async () => {
      await expect(summarize('   \n  ')).rejects.toThrow('Content to summarize is required');
    });

    test('should use Haiku model for efficiency', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Summary' }],
        usage: { input_tokens: 20, output_tokens: 10 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      await summarize('Content to summarize');

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.stringContaining('haiku')
        })
      );
    });
  });

  // ============= Categorize Function Tests =============
  describe('categorize function', () => {
    beforeEach(() => {
      initClaudeClient({ apiKey: 'test-key' });
    });

    test('should categorize content successfully', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: '{"category": "Technology", "confidence": 0.95, "reasoning": "The content discusses cloud infrastructure"}'
          }
        ],
        usage: { input_tokens: 40, output_tokens: 20 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const result = await categorize(
        'Exploring cloud infrastructure and DevOps practices',
        ['Technology', 'Business', 'Education']
      );

      expect(result.category).toBe('Technology');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning).toBeDefined();
    });

    test('should clamp confidence between 0 and 1', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: '{"category": "Tech", "confidence": 1.5, "reasoning": "Over confident"}'
          }
        ],
        usage: { input_tokens: 40, output_tokens: 20 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const result = await categorize('Test content', ['Tech', 'Other']);

      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should throw error on empty content', async () => {
      await expect(categorize('', ['Category1', 'Category2'])).rejects.toThrow(
        'Content to categorize is required'
      );
    });

    test('should throw error on empty categories array', async () => {
      await expect(categorize('Some content', [])).rejects.toThrow(
        'Categories array must not be empty'
      );
    });

    test('should throw error on invalid JSON response', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: 'Not valid JSON'
          }
        ],
        usage: { input_tokens: 40, output_tokens: 20 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      await expect(categorize('Content', ['A', 'B'])).rejects.toThrow('Invalid categorization response format');
    });

    test('should use Haiku model for efficiency', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: '{"category": "A", "confidence": 0.8, "reasoning": "Match"}'
          }
        ],
        usage: { input_tokens: 40, output_tokens: 20 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      await categorize('Content', ['A', 'B']);

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.stringContaining('haiku')
        })
      );
    });
  });

  // ============= Analyze Query Function Tests =============
  describe('analyzeQuery function', () => {
    beforeEach(() => {
      initClaudeClient({ apiKey: 'test-key' });
    });

    test('should analyze search query successfully', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: '{"intent": "question", "mainTopic": "Infrastructure Transparency", "subtopics": ["policies", "frameworks"], "suggestedFilters": {"type": "policy"}}'
          }
        ],
        usage: { input_tokens: 30, output_tokens: 25 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const result = await analyzeQuery('How does infrastructure transparency work?');

      expect(result.intent).toBe('question');
      expect(result.mainTopic).toBeDefined();
      expect(Array.isArray(result.subtopics)).toBe(true);
      expect(typeof result.suggestedFilters).toBe('object');
    });

    test('should validate intent values', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: '{"intent": "invalid", "mainTopic": "Topic", "subtopics": [], "suggestedFilters": {}}'
          }
        ],
        usage: { input_tokens: 30, output_tokens: 25 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const result = await analyzeQuery('test query');

      expect(['search', 'question', 'command', 'clarification']).toContain(result.intent);
    });

    test('should provide defaults for missing fields', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: '{"intent": "search"}'
          }
        ],
        usage: { input_tokens: 30, output_tokens: 25 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const result = await analyzeQuery('my query');

      expect(result.mainTopic).toBeDefined();
      expect(Array.isArray(result.subtopics)).toBe(true);
      expect(result.subtopics.length).toBe(0);
      expect(typeof result.suggestedFilters).toBe('object');
    });

    test('should handle parse error gracefully and return fallback', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: 'Invalid JSON response'
          }
        ],
        usage: { input_tokens: 30, output_tokens: 25 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const query = 'test query';
      const result = await analyzeQuery(query);

      expect(result.intent).toBe('search');
      expect(result.mainTopic).toBe(query);
      expect(result.subtopics).toEqual([]);
      expect(result.suggestedFilters).toEqual({});
    });

    test('should throw error on empty query', async () => {
      await expect(analyzeQuery('')).rejects.toThrow('Query is required');
    });

    test('should throw error on whitespace query', async () => {
      await expect(analyzeQuery('   ')).rejects.toThrow('Query is required');
    });

    test('should use Haiku model for efficiency', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: '{"intent": "search", "mainTopic": "topic", "subtopics": [], "suggestedFilters": {}}'
          }
        ],
        usage: { input_tokens: 30, output_tokens: 25 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      await analyzeQuery('test');

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.stringContaining('haiku')
        })
      );
    });
  });

  // ============= Stream Chat Function Tests =============
  describe('streamChat function', () => {
    beforeEach(() => {
      initClaudeClient({ apiKey: 'test-key' });
    });

    test('should stream chat response', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: jest.fn(async function* () {
          yield {
            type: 'message_start',
            message: { usage: { input_tokens: 10 } }
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello ' }
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'world' }
          };
          yield {
            type: 'message_delta',
            usage: { output_tokens: 20 }
          };
        })
      };

      mockClient.messages.stream.mockReturnValue(mockStream);

      const chunks: string[] = [];
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Say hello' }
      ];

      const tokenUsage = await streamChat(messages, async (chunk) => {
        chunks.push(chunk);
      });

      expect(chunks).toContain('Hello ');
      expect(chunks).toContain('world');
      expect(tokenUsage.totalTokens).toBeGreaterThan(0);
    });

    test('should throw error on empty messages', async () => {
      const onChunk = jest.fn();
      await expect(streamChat([], onChunk)).rejects.toThrow('Messages array must not be empty');
    });

    test('should throw error when onChunk is not provided', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' }
      ];

      await expect(streamChat(messages, null as any)).rejects.toThrow('onChunk callback is required');
    });

    test('should track token usage during streaming', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: jest.fn(async function* () {
          yield {
            type: 'message_start',
            message: { usage: { input_tokens: 50 } }
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Response' }
          };
          yield {
            type: 'message_delta',
            usage: { output_tokens: 100 }
          };
        })
      };

      mockClient.messages.stream.mockReturnValue(mockStream);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' }
      ];

      const tokenUsage = await streamChat(messages, async () => {});

      expect(tokenUsage.inputTokens).toBe(50);
      expect(tokenUsage.outputTokens).toBe(100);
      expect(tokenUsage.totalTokens).toBe(150);
    });
  });

  // ============= Token Tracking Tests =============
  describe('Token tracking', () => {
    beforeEach(() => {
      initClaudeClient({ apiKey: 'test-key' });
      resetTokenTracking();
    });

    test('should track token usage across multiple calls', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 20 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' }
      ];

      await chat(messages);
      await chat(messages);
      await chat(messages);

      const stats = getTokenUsageStats();

      expect(stats.totalRequests).toBe(3);
      expect(stats.totalTokens).toBe(90); // 30 tokens per call * 3
      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.averageTokensPerRequest).toBe(30);
    });

    test('should return correct token statistics', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Response' }],
        usage: { input_tokens: 25, output_tokens: 75 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' }
      ];

      await chat(messages);

      const stats = getTokenUsageStats();

      expect(stats.totalRequests).toBe(1);
      expect(stats.totalTokens).toBe(100);
      expect(stats.tokenLog.length).toBe(1);
      expect(stats.tokenLog[0].inputTokens).toBe(25);
      expect(stats.tokenLog[0].outputTokens).toBe(75);
    });

    test('should reset token tracking', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 20 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' }
      ];

      await chat(messages);

      let stats = getTokenUsageStats();
      expect(stats.totalRequests).toBe(1);

      resetTokenTracking();

      stats = getTokenUsageStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.totalCost).toBe(0);
    });
  });

  // ============= Batch Processing Tests =============
  describe('batchProcess function', () => {
    test('should process items in batches', async () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      const processor = jest.fn().mockResolvedValue({ processed: true });

      const results = await batchProcess(items, processor, 10);

      expect(results).toHaveLength(25);
      expect(processor).toHaveBeenCalledTimes(25);
    });

    test('should handle batch size correctly', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i }));
      const processor = jest.fn().mockResolvedValue({ processed: true });

      await batchProcess(items, processor, 2);

      expect(processor).toHaveBeenCalledTimes(5);
    });

    test('should preserve item order in results', async () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const processor = jest.fn(async (item) => ({ ...item, processed: true }));

      const results = await batchProcess(items, processor);

      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
      expect(results[2].id).toBe(3);
    });

    test('should handle processor errors', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const processor = jest.fn().mockRejectedValue(new Error('Processing failed'));

      await expect(batchProcess(items, processor)).rejects.toThrow('Processing failed');
    });
  });

  // ============= Integration Tests =============
  describe('Integration tests', () => {
    beforeEach(() => {
      initClaudeClient({ apiKey: 'test-key' });
      resetTokenTracking();
    });

    test('should handle complete workflow', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Response' }],
        usage: { input_tokens: 20, output_tokens: 30 },
        stop_reason: 'end_turn'
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      // Simulate a complete user workflow
      const query = 'Tell me about infrastructure transparency';

      // 1. Analyze the query
      const analysis = await analyzeQuery(query);
      expect(analysis.mainTopic).toBeDefined();

      // 2. Chat with the model
      const messages: ChatMessage[] = [
        { role: 'user', content: query }
      ];
      const response = await chat(messages);
      expect(response.content).toBeDefined();

      // 3. Get token stats
      const stats = getTokenUsageStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.totalCost).toBeGreaterThan(0);
    });
  });
});
