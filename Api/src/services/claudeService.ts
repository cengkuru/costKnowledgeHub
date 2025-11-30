import Anthropic from '@anthropic-ai/sdk';
import { MessageParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages';

// Type definitions
export interface ClaudeConfig {
  apiKey: string;
  defaultModel?: 'haiku' | 'opus';
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface ClaudeResponse {
  content: string;
  tokenUsage: TokenUsage;
  model: string;
  stopReason: string;
}

export interface StreamChunkHandler {
  (chunk: string): Promise<void> | void;
}

// Model configuration - Maps to actual Claude model names
const MODELS = {
  haiku: 'claude-3-5-haiku-20241022',
  opus: 'claude-opus-4-20250514'
} as const;

// Pricing per 1M tokens (as of Nov 2024)
const PRICING = {
  'claude-3-5-haiku-20241022': {
    input: 0.80,
    output: 4.00
  },
  'claude-opus-4-20250514': {
    input: 15.00,
    output: 75.00
  }
} as const;

// Global client instance
let claudeClient: Anthropic | null = null;
let tokenLog: TokenUsage[] = [];
let totalCost = 0;

/**
 * Initialize Claude client with API key
 */
export function initClaudeClient(config: ClaudeConfig): void {
  if (!config.apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required to initialize Claude client');
  }

  claudeClient = new Anthropic({
    apiKey: config.apiKey,
    maxRetries: config.maxRetries || 3,
    defaultHeaders: {
      'user-agent': 'cost-knowledge-hub/1.0'
    }
  });
}

/**
 * Ensure client is initialized
 */
function ensureClient(): Anthropic {
  if (!claudeClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    initClaudeClient({ apiKey });
  }
  return claudeClient!;
}

/**
 * Calculate estimated cost for token usage
 */
function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model as keyof typeof PRICING];
  if (!pricing) {
    console.warn(`Unknown model ${model}, cost calculation may be inaccurate`);
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Log token usage for monitoring
 */
function logTokenUsage(usage: TokenUsage, model?: string): void {
  tokenLog.push(usage);
  totalCost += usage.estimatedCost;

  if (model) {
    console.log(`[Claude] Model: ${model}`);
  }
  console.log(`[Claude] Tokens: ${usage.inputTokens} in + ${usage.outputTokens} out = ${usage.totalTokens}`);
  console.log(`[Claude] Cost: $${usage.estimatedCost.toFixed(6)} (Total: $${totalCost.toFixed(6)})`);
}

/**
 * Main chat function - for conversational interactions
 */
export async function chat(
  messages: ChatMessage[],
  model: 'haiku' | 'opus' = 'opus',
  systemPrompt?: string
): Promise<ClaudeResponse> {
  const client = ensureClient();
  const modelId = MODELS[model];

  // Validate messages
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array must not be empty');
  }

  // Convert to Claude message format
  const claudeMessages: MessageParam[] = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  try {
    const response = await client.messages.create({
      model: modelId,
      max_tokens: 2048,
      system: systemPrompt || 'You are a helpful assistant for a Knowledge Hub focused on Infrastructure Transparency.',
      messages: claudeMessages
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

    const tokenUsage: TokenUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      estimatedCost: calculateCost(
        modelId,
        response.usage.input_tokens,
        response.usage.output_tokens
      )
    };

    logTokenUsage(tokenUsage, modelId);

    return {
      content,
      tokenUsage,
      model: modelId,
      stopReason: response.stop_reason || 'unknown'
    };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error(`Rate limit exceeded. Please try again later. ${error.message}`);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error(`Authentication failed. Check your ANTHROPIC_API_KEY. ${error.message}`);
    }
    throw error;
  }
}

/**
 * Summarize content - uses Haiku for efficiency
 */
export async function summarize(
  content: string,
  maxLength: number = 500
): Promise<ClaudeResponse> {
  if (!content || content.trim().length === 0) {
    throw new Error('Content to summarize is required');
  }

  const systemPrompt = `You are an expert at creating concise, informative summaries.
Create a summary in approximately ${maxLength} characters or less.
Focus on key points and actionable insights.`;

  const userMessage: ChatMessage = {
    role: 'user',
    content: `Please summarize the following content:\n\n${content}`
  };

  return chat([userMessage], 'haiku', systemPrompt);
}

/**
 * Categorize content into provided categories - uses Haiku
 */
export async function categorize(
  content: string,
  categories: string[]
): Promise<{ category: string; confidence: number; reasoning: string }> {
  if (!content || content.trim().length === 0) {
    throw new Error('Content to categorize is required');
  }

  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('Categories array must not be empty');
  }

  const systemPrompt = `You are an expert content classifier.
Analyze the provided content and determine which category it best fits.
Respond ONLY with a valid JSON object containing:
{
  "category": "the best matching category",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why"
}`;

  const userMessage: ChatMessage = {
    role: 'user',
    content: `Categorize this content into one of: ${categories.join(', ')}

Content: ${content}`
  };

  try {
    const response = await chat([userMessage], 'haiku', systemPrompt);

    // Parse JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid categorization response format');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate result
    if (!result.category || typeof result.confidence !== 'number') {
      throw new Error('Invalid categorization result structure');
    }

    return {
      category: result.category,
      confidence: Math.min(1, Math.max(0, result.confidence)),
      reasoning: result.reasoning || 'No reasoning provided'
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse categorization response');
    }
    throw error;
  }
}

/**
 * Analyze search query to understand intent - uses Haiku
 */
export async function analyzeQuery(
  query: string
): Promise<{
  intent: 'search' | 'question' | 'command' | 'clarification';
  mainTopic: string;
  subtopics: string[];
  suggestedFilters: Record<string, string>;
}> {
  if (!query || query.trim().length === 0) {
    throw new Error('Query is required');
  }

  const systemPrompt = `You are an expert search analyst.
Analyze the user's search query and respond with ONLY a valid JSON object:
{
  "intent": "search|question|command|clarification",
  "mainTopic": "primary topic",
  "subtopics": ["topic1", "topic2"],
  "suggestedFilters": {"filterKey": "filterValue"}
}`;

  const userMessage: ChatMessage = {
    role: 'user',
    content: `Analyze this search query: "${query}"`
  };

  try {
    const response = await chat([userMessage], 'haiku', systemPrompt);

    // Parse JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback for invalid format
      return {
        intent: 'search',
        mainTopic: query,
        subtopics: [],
        suggestedFilters: {}
      };
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and provide defaults
    return {
      intent: (['search', 'question', 'command', 'clarification'].includes(result.intent)
        ? result.intent
        : 'search') as 'search' | 'question' | 'command' | 'clarification',
      mainTopic: result.mainTopic || query,
      subtopics: Array.isArray(result.subtopics) ? result.subtopics : [],
      suggestedFilters: typeof result.suggestedFilters === 'object' ? result.suggestedFilters : {}
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Fallback for parse errors
      return {
        intent: 'search',
        mainTopic: query,
        subtopics: [],
        suggestedFilters: {}
      };
    }
    throw error;
  }
}

/**
 * Stream chat response for real-time interactions
 */
export async function streamChat(
  messages: ChatMessage[],
  onChunk: StreamChunkHandler,
  model: 'haiku' | 'opus' = 'opus',
  systemPrompt?: string
): Promise<TokenUsage> {
  const client = ensureClient();
  const modelId = MODELS[model];

  // Validate messages
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array must not be empty');
  }

  if (!onChunk || typeof onChunk !== 'function') {
    throw new Error('onChunk callback is required');
  }

  // Convert to Claude message format
  const claudeMessages: MessageParam[] = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  try {
    const stream = client.messages.stream({
      model: modelId,
      max_tokens: 2048,
      system: systemPrompt || 'You are a helpful assistant for a Knowledge Hub focused on Infrastructure Transparency.',
      messages: claudeMessages
    });

    let inputTokens = 0;
    let outputTokens = 0;

    // Process stream events
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        await onChunk(text);
      }

      // Capture token usage from message_delta
      if (event.type === 'message_delta' && event.usage) {
        outputTokens = event.usage.output_tokens;
      }

      // Get initial input tokens from message_start
      if (event.type === 'message_start' && event.message.usage) {
        inputTokens = event.message.usage.input_tokens;
      }
    }

    const tokenUsage: TokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: calculateCost(modelId, inputTokens, outputTokens)
    };

    logTokenUsage(tokenUsage, modelId);

    return tokenUsage;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error(`Rate limit exceeded. Please try again later. ${error.message}`);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error(`Authentication failed. Check your ANTHROPIC_API_KEY. ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get token usage statistics
 */
export function getTokenUsageStats(): {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageTokensPerRequest: number;
  tokenLog: TokenUsage[];
} {
  const totalTokens = tokenLog.reduce((sum, log) => sum + log.totalTokens, 0);
  const totalRequests = tokenLog.length;

  return {
    totalRequests,
    totalTokens,
    totalCost,
    averageTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
    tokenLog: [...tokenLog]
  };
}

/**
 * Reset token tracking
 */
export function resetTokenTracking(): void {
  tokenLog = [];
  totalCost = 0;
}

/**
 * Batch process multiple items with Claude
 */
export async function batchProcess<T extends Record<string, any>>(
  items: T[],
  processor: (item: T) => Promise<any>,
  batchSize: number = 10
): Promise<any[]> {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
