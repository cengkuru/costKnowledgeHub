/**
 * Batch Embedding Generator (Fixed Dimensions)
 *
 * Efficiently generates embeddings with explicit dimension control
 */

import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 1536; // Force 1536 dimensions
const BATCH_SIZE = 500; // Conservative batch size for large content (500 * ~500 tokens avg = 250k max)
const RATE_LIMIT_DELAY = 1000;

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  index: number;
}

/**
 * Generate embeddings for a single text with explicit dimensions
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS // Explicit dimension control
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

/**
 * Generate embeddings for multiple texts in batches
 */
export const generateEmbeddingsBatch = async (
  texts: string[],
  options: {
    batchSize?: number;
    delayMs?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<EmbeddingResult[]> => {
  const {
    batchSize = BATCH_SIZE,
    delayMs = RATE_LIMIT_DELAY,
    onProgress
  } = options;

  const results: EmbeddingResult[] = [];
  const totalBatches = Math.ceil(texts.length / batchSize);

  console.log(`Generating embeddings for ${texts.length} texts in ${totalBatches} batches...`);
  console.log(`Using model: ${EMBEDDING_MODEL} with ${EMBEDDING_DIMENSIONS} dimensions`);

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    try {
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)...`);

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS // Explicit dimension control
      });

      response.data.forEach((item, batchIndex) => {
        results.push({
          text: batch[batchIndex],
          embedding: item.embedding,
          index: i + batchIndex
        });
      });

      if (onProgress) {
        onProgress(results.length, texts.length);
      }

      if (i + batchSize < texts.length && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Error processing batch ${batchNumber}:`, error);

      // Retry individual items
      console.log(`Retrying batch ${batchNumber} with individual requests...`);
      for (let j = 0; j < batch.length; j++) {
        try {
          const embedding = await generateEmbedding(batch[j]);
          results.push({
            text: batch[j],
            embedding,
            index: i + j
          });

          if (onProgress) {
            onProgress(results.length, texts.length);
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (retryError) {
          console.error(`Failed to embed text at index ${i + j}:`, retryError);
        }
      }
    }
  }

  console.log(`Successfully generated ${results.length} embeddings`);
  return results;
};

/**
 * Estimate cost of embedding generation
 */
export const estimateEmbeddingCost = (texts: string[]): {
  approximateTokens: number;
  estimatedCostUSD: number;
} => {
  const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
  const approximateTokens = Math.ceil(totalChars / 4);
  const estimatedCostUSD = (approximateTokens / 1_000_000) * 0.13;

  return {
    approximateTokens,
    estimatedCostUSD
  };
};

/**
 * Validate embeddings have correct dimensions
 */
export const validateEmbeddings = (embeddings: number[][]): boolean => {
  return embeddings.every(emb =>
    Array.isArray(emb) &&
    emb.length === EMBEDDING_DIMENSIONS &&
    emb.every(val => typeof val === 'number' && !isNaN(val))
  );
};
