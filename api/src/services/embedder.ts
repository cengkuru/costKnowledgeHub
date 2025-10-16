import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

/**
 * Generates embeddings using OpenAI's text-embedding-3-large model
 *
 * Supports both single strings and batches
 * Returns 1536-dimensional vectors (explicitly set to match vector index)
 *
 * @param input Single string or array of strings to embed
 * @returns Single embedding vector or array of vectors
 */
export const embed = async (
  input: string | string[]
): Promise<number[] | number[][]> => {
  const { data } = await openai.embeddings.create({
    model: config.openaiEmbeddingModel,
    input,
    dimensions: 1536 // Must match vector index configuration
  });

  // Return format matches input format
  if (Array.isArray(input)) {
    return data.map(d => d.embedding);
  }

  return data[0].embedding;
};
