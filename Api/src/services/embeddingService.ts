/**
 * Embedding Service
 * Uses Google's text-embedding model to generate vector embeddings
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Embedding dimensions for text-embedding-004
export const EMBEDDING_DIMENSIONS = 768;

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export const embeddingService = {
  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for embedding generation');
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  },

  /**
   * Generate embeddings for multiple texts (batched)
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (text) => {
          try {
            const embedding = await this.generateEmbedding(text);
            return { embedding, text };
          } catch (error) {
            console.error(`Failed to generate embedding for text: ${text.substring(0, 50)}...`);
            return null;
          }
        })
      );

      results.push(...batchResults.filter((r): r is EmbeddingResult => r !== null));

      // Small delay between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  },

  /**
   * Create searchable text from resource fields
   */
  createResourceText(resource: {
    title: string;
    description: string;
    themes?: string[];
    tags?: string[];
    countryPrograms?: string[];
  }): string {
    const parts = [
      resource.title,
      resource.description,
      resource.themes?.join(' ') || '',
      resource.tags?.join(' ') || '',
      resource.countryPrograms?.map(c => c.replace(/_/g, ' ')).join(' ') || '',
    ];

    return parts.filter(p => p.trim()).join('. ');
  },

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  },
};
