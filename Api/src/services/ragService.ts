import { ObjectId, Collection } from 'mongodb';
import { db } from '../config/database';
import { DocumentChunk, CHUNKS_COLLECTION } from '../models/DocumentChunk';
import { ResourceType, Theme, LanguageCode } from '../models/Resource';
import { chat as claudeChat, ChatMessage } from './claudeService';
import { getAI } from './aiService';
import { ApiError } from '../middleware/errorHandler';

// RAG filter types
export interface RAGFilters {
  themes?: Theme[];
  resourceTypes?: ResourceType[];
  language?: LanguageCode;
  countryPrograms?: string[];
}

// Retrieved chunk with metadata
export interface RetrievedChunk {
  chunkId: string;
  content: string;
  resourceId: string;
  resourceTitle: string;
  resourceUrl: string;
  score: number;
  metadata: {
    sourceSection: string;
    pageNumber?: number;
    resourceType: ResourceType;
    language: LanguageCode;
    themes: Theme[];
  };
}

// Citation structure
export interface Citation {
  resourceId: string;
  resourceTitle: string;
  chunkId: string;
  excerpt: string;
  url: string;
  pageNumber?: number;
  section?: string;
}

// RAG response
export interface RAGResponse {
  answer: string;
  citations: Citation[];
  confidence: 'high' | 'medium' | 'low' | 'uncertain';
  followUpQuestions?: string[];
}

// Message type for chat history
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * RAG Service - Handles retrieval-augmented generation
 */
export const ragService = {
  /**
   * Get chunks collection
   */
  getCollection(): Collection<DocumentChunk> {
    return db.collection<DocumentChunk>(CHUNKS_COLLECTION);
  },

  /**
   * Main chat endpoint - orchestrates RAG pipeline
   */
  async chat(
    query: string,
    sessionId: string,
    filters?: RAGFilters
  ): Promise<RAGResponse> {
    if (!query || query.trim().length === 0) {
      throw new ApiError(400, 'Query is required');
    }

    // 1. Retrieve relevant context
    const context = await this.retrieveContext(query, 5, filters);

    // 2. Generate answer with citations
    const response = await this.generateAnswer(query, context);

    return response;
  },

  /**
   * Retrieve relevant chunks using hybrid search
   */
  async retrieveContext(
    query: string,
    topK: number = 5,
    filters?: RAGFilters
  ): Promise<RetrievedChunk[]> {
    try {
      // Generate query embedding
      const ai = getAI();
      const queryEmbedding = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: query
      });

      const collection = this.getCollection();

      // Build filter query
      const filterQuery: any = {};
      if (filters?.themes && filters.themes.length > 0) {
        filterQuery.themes = { $in: filters.themes };
      }
      if (filters?.resourceTypes && filters.resourceTypes.length > 0) {
        filterQuery.resourceType = { $in: filters.resourceTypes };
      }
      if (filters?.language) {
        filterQuery.language = filters.language;
      }

      // Vector search using aggregation pipeline
      const vectorResults = await collection.aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: queryEmbedding.embeddings?.[0]?.values || [],
            numCandidates: topK * 10,
            limit: topK,
            filter: Object.keys(filterQuery).length > 0 ? filterQuery : undefined
          }
        },
        {
          $addFields: {
            vectorScore: { $meta: 'vectorSearchScore' }
          }
        }
      ]).toArray();

      // Keyword search using text index
      const keywordResults = await collection.find(
        {
          $text: { $search: query },
          ...filterQuery
        },
        {
          score: { $meta: 'textScore' }
        }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(topK)
        .toArray();

      // Combine and rank results (hybrid search)
      const combinedResults = this.combineSearchResults(
        vectorResults as any,
        keywordResults as any,
        topK
      );

      // Fetch resource metadata for each chunk
      const enrichedResults = await this.enrichWithResourceMetadata(combinedResults);

      return enrichedResults;
    } catch (error) {
      console.error('Context retrieval error:', error);
      // Return empty results instead of throwing
      return [];
    }
  },

  /**
   * Combine vector and keyword search results with weighted scoring
   */
  combineSearchResults(
    vectorResults: any[],
    keywordResults: any[],
    topK: number
  ): DocumentChunk[] {
    const scoreMap = new Map<string, { chunk: DocumentChunk; score: number }>();

    // Add vector results (70% weight)
    vectorResults.forEach(result => {
      const id = result._id.toString();
      scoreMap.set(id, {
        chunk: result,
        score: (result.vectorScore || 0) * 0.7
      });
    });

    // Add keyword results (30% weight)
    keywordResults.forEach(result => {
      const id = result._id.toString();
      const existing = scoreMap.get(id);

      if (existing) {
        // Combine scores if chunk appears in both
        existing.score += (result.score || 0) * 0.3;
      } else {
        scoreMap.set(id, {
          chunk: result,
          score: (result.score || 0) * 0.3
        });
      }
    });

    // Sort by combined score and take top K
    const sorted = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return sorted.map(item => item.chunk);
  },

  /**
   * Enrich chunks with resource metadata
   */
  async enrichWithResourceMetadata(chunks: DocumentChunk[]): Promise<RetrievedChunk[]> {
    if (chunks.length === 0) {
      return [];
    }

    const resourceIds = [...new Set(chunks.map(c => c.resourceId))];

    // Fetch resources
    const resourcesCollection = db.collection('resources');
    const resources = await resourcesCollection
      .find({ _id: { $in: resourceIds } })
      .toArray();

    const resourceMap = new Map(
      resources.map(r => [r._id.toString(), r])
    );

    // Enrich chunks
    return chunks
      .map((chunk, index) => {
        const resource = resourceMap.get(chunk.resourceId.toString());
        if (!resource) return null;

        return {
          chunkId: chunk._id?.toString() || '',
          content: chunk.content,
          resourceId: resource._id.toString(),
          resourceTitle: resource.title,
          resourceUrl: resource.url,
          score: 1.0 - (index * 0.1), // Approximated score based on rank
          metadata: {
            sourceSection: chunk.sourceSection,
            pageNumber: chunk.pageNumber,
            resourceType: chunk.resourceType,
            language: chunk.language,
            themes: chunk.themes
          }
        };
      })
      .filter(item => item !== null) as RetrievedChunk[];
  },

  /**
   * Generate answer with citations using Claude
   */
  async generateAnswer(
    query: string,
    context: RetrievedChunk[],
    history?: Message[]
  ): Promise<RAGResponse> {
    // Handle no context case
    if (context.length === 0) {
      const systemPrompt = `You are a helpful assistant for the CoST Knowledge Hub.
The user asked a question but no relevant context was found in the knowledge base.
Politely explain that you don't have specific information about this topic and suggest they:
1. Rephrase their question
2. Check the CoST website directly
3. Contact CoST support`;

      const messages: ChatMessage[] = [
        { role: 'user', content: query }
      ];

      const response = await claudeChat(messages, 'haiku', systemPrompt);

      return {
        answer: response.content,
        citations: [],
        confidence: 'uncertain'
      };
    }

    // Build context string
    const contextStr = context
      .map((chunk, idx) => {
        return `[${idx + 1}] ${chunk.metadata.sourceSection} (${chunk.resourceTitle})\n${chunk.content}`;
      })
      .join('\n\n---\n\n');

    // Build system prompt
    const systemPrompt = `You are an expert assistant for the CoST (Infrastructure Transparency Initiative) Knowledge Hub.

Your role is to answer questions about infrastructure transparency, data standards (especially OC4IDS), procurement, and CoST programs.

CRITICAL RULES:
1. ALWAYS cite your sources using [1], [2], etc. notation
2. ONLY use information from the provided context
3. If the context doesn't fully answer the question, say so
4. Be concise but thorough
5. Use the exact citation numbers matching the context chunks

Context:
${contextStr}

Remember: Every statement must be backed by a citation [N].`;

    // Build message history
    const messages: ChatMessage[] = [];

    if (history && history.length > 0) {
      // Include last 3 exchanges for context
      const recentHistory = history.slice(-6);
      messages.push(...recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }

    messages.push({ role: 'user', content: query });

    // Determine which model to use based on complexity
    const useOpus = context.length > 3 || query.length > 200;
    const model = useOpus ? 'opus' : 'haiku';

    // Generate answer
    const response = await claudeChat(messages, model, systemPrompt);

    // Extract citations from answer
    const citations = this.extractCitations(context);

    // Determine confidence based on context relevance
    const avgScore = context.reduce((sum, c) => sum + c.score, 0) / context.length;
    let confidence: 'high' | 'medium' | 'low' | 'uncertain';
    if (avgScore > 0.8) confidence = 'high';
    else if (avgScore > 0.6) confidence = 'medium';
    else if (avgScore > 0.4) confidence = 'low';
    else confidence = 'uncertain';

    // Generate follow-up questions
    const followUpQuestions = await this.generateFollowUpQuestions(query, response.content, context);

    return {
      answer: response.content,
      citations,
      confidence,
      followUpQuestions
    };
  },

  /**
   * Extract citations from retrieved chunks
   */
  extractCitations(chunks: RetrievedChunk[]): Citation[] {
    return chunks.map(chunk => ({
      resourceId: chunk.resourceId,
      resourceTitle: chunk.resourceTitle,
      chunkId: chunk.chunkId,
      excerpt: this.createExcerpt(chunk.content, 200),
      url: chunk.resourceUrl,
      pageNumber: chunk.metadata.pageNumber,
      section: chunk.metadata.sourceSection
    }));
  },

  /**
   * Create excerpt from content
   */
  createExcerpt(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    return truncated.substring(0, lastSpace) + '...';
  },

  /**
   * Generate follow-up questions
   */
  async generateFollowUpQuestions(
    originalQuery: string,
    answer: string,
    context: RetrievedChunk[]
  ): Promise<string[]> {
    try {
      const systemPrompt = `Based on the user's question and answer, suggest 2-3 relevant follow-up questions.
Return ONLY a JSON array of strings.
Questions should be specific, actionable, and related to the topic.`;

      const userMessage: ChatMessage = {
        role: 'user',
        content: `Question: ${originalQuery}\n\nAnswer: ${answer}\n\nSuggest follow-up questions:`
      };

      const response = await claudeChat([userMessage], 'haiku', systemPrompt);

      // Parse JSON response
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const questions = JSON.parse(jsonMatch[0]);
      return Array.isArray(questions) ? questions.slice(0, 3) : [];
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return [];
    }
  },

  /**
   * Verify answer faithfulness to context (optional quality check)
   */
  async verifyFaithfulness(
    answer: string,
    context: RetrievedChunk[]
  ): Promise<{ faithful: boolean; reasoning: string }> {
    const contextStr = context.map(c => c.content).join('\n\n');

    const systemPrompt = `You are a fact-checker. Determine if the answer is faithful to the context.
Respond with JSON: {"faithful": true/false, "reasoning": "brief explanation"}`;

    const userMessage: ChatMessage = {
      role: 'user',
      content: `Context:\n${contextStr}\n\nAnswer:\n${answer}\n\nIs this answer faithful to the context?`
    };

    try {
      const response = await claudeChat([userMessage], 'haiku', systemPrompt);
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return { faithful: true, reasoning: 'Unable to verify' };
      }

      const result = JSON.parse(jsonMatch[0]);
      return {
        faithful: result.faithful ?? true,
        reasoning: result.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      console.error('Faithfulness verification error:', error);
      return { faithful: true, reasoning: 'Verification failed' };
    }
  }
};
