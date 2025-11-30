import { ObjectId, Collection } from 'mongodb';
import { db } from '../config/database';
import { DocumentChunk, CreateChunkSchema, CHUNKS_COLLECTION, CHUNK_STRATEGIES } from '../models/DocumentChunk';
import { ResourceType, Theme, LanguageCode } from '../models/Resource';
import { GoogleGenAI } from '@google/genai';
import { getAI } from './aiService';
import { ApiError } from '../middleware/errorHandler';

/**
 * ChunkingService - Handles document chunking for RAG pipeline
 */
export const chunkingService = {
  /**
   * Get chunks collection
   */
  getCollection(): Collection<DocumentChunk> {
    return db.collection<DocumentChunk>(CHUNKS_COLLECTION);
  },

  /**
   * Chunk a document based on its resource type
   */
  async chunkDocument(
    resourceId: ObjectId,
    content: string,
    resourceType: ResourceType,
    language: LanguageCode,
    themes: Theme[]
  ): Promise<DocumentChunk[]> {
    if (!content || content.trim().length < 100) {
      throw new ApiError(400, 'Content must be at least 100 characters');
    }

    const strategy = CHUNK_STRATEGIES[resourceType as keyof typeof CHUNK_STRATEGIES];
    let chunks: DocumentChunk[] = [];

    if (!strategy) {
      throw new ApiError(400, `Unknown resource type: ${resourceType}`);
    }

    switch (strategy.strategy) {
      case 'heading':
        chunks = this.chunkByHeadings(content, resourceId, resourceType, language, themes);
        break;
      case 'finding':
        chunks = this.chunkByFindings(content, resourceId, resourceType, language, themes);
        break;
      case 'step':
        chunks = this.chunkBySteps(content, resourceId, resourceType, language, themes);
        break;
      case 'narrative':
        chunks = this.chunkByParagraphs(content, resourceId, resourceType, language, themes, strategy.maxTokens);
        break;
    }

    // Validate chunks
    const validChunks = chunks.filter(chunk => {
      try {
        CreateChunkSchema.parse(chunk);
        return true;
      } catch {
        return false;
      }
    });

    return validChunks;
  },

  /**
   * Chunk by headings (for guidance documents)
   */
  chunkByHeadings(
    content: string,
    resourceId: ObjectId,
    resourceType: ResourceType,
    language: LanguageCode,
    themes: Theme[]
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;

    const matches: Array<{ level: number; title: string; index: number }> = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      matches.push({
        level: match[1].length,
        title: match[2].trim(),
        index: match.index
      });
    }

    if (matches.length === 0) {
      // No headings found, chunk by paragraphs
      return this.chunkByParagraphs(content, resourceId, resourceType, language, themes, 1000);
    }

    // Add final marker
    matches.push({
      level: 1,
      title: 'End',
      index: content.length
    });

    for (let i = 1; i < matches.length; i++) {
      const start = matches[i - 1].index;
      const end = matches[i].index;
      const chunkContent = content.substring(start, end).trim();

      if (chunkContent.length > 100) {
        chunks.push({
          resourceId,
          content: chunkContent,
          sourceSection: matches[i - 1].title,
          charStart: start,
          charEnd: end,
          resourceType,
          language,
          themes,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    return chunks;
  },

  /**
   * Chunk by findings (for assurance reports)
   */
  chunkByFindings(
    content: string,
    resourceId: ObjectId,
    resourceType: ResourceType,
    language: LanguageCode,
    themes: Theme[]
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const findingRegex = /FINDING\s+(\d+):\s*([^\n]+)/gi;

    const matches: Array<{ number: string; title: string; index: number }> = [];
    let match;

    while ((match = findingRegex.exec(content)) !== null) {
      matches.push({
        number: match[1],
        title: match[2].trim(),
        index: match.index
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i < matches.length - 1 ? matches[i + 1].index : content.length;
      const chunkContent = content.substring(start, end).trim();

      if (chunkContent.length > 100) {
        chunks.push({
          resourceId,
          content: chunkContent,
          sourceSection: `FINDING ${matches[i].number}: ${matches[i].title}`,
          charStart: start,
          charEnd: end,
          resourceType,
          language,
          themes,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    // If no findings found, fall back to paragraph chunking
    if (chunks.length === 0) {
      return this.chunkByParagraphs(content, resourceId, resourceType, language, themes, 600);
    }

    return chunks;
  },

  /**
   * Chunk by steps (for tools/templates)
   */
  chunkBySteps(
    content: string,
    resourceId: ObjectId,
    resourceType: ResourceType,
    language: LanguageCode,
    themes: Theme[]
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const stepRegex = /Step\s+(\d+):\s*([^\n]+)/gi;

    const matches: Array<{ number: string; title: string; index: number }> = [];
    let match;

    while ((match = stepRegex.exec(content)) !== null) {
      matches.push({
        number: match[1],
        title: match[2].trim(),
        index: match.index
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i < matches.length - 1 ? matches[i + 1].index : content.length;
      const chunkContent = content.substring(start, end).trim();

      if (chunkContent.length > 100) {
        chunks.push({
          resourceId,
          content: chunkContent,
          sourceSection: `Step ${matches[i].number}: ${matches[i].title}`,
          charStart: start,
          charEnd: end,
          resourceType,
          language,
          themes,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    // If no steps found, fall back to paragraph chunking
    if (chunks.length === 0) {
      return this.chunkByParagraphs(content, resourceId, resourceType, language, themes, 400);
    }

    return chunks;
  },

  /**
   * Chunk by paragraphs with token limits (for narrative content)
   */
  chunkByParagraphs(
    content: string,
    resourceId: ObjectId,
    resourceType: ResourceType,
    language: LanguageCode,
    themes: Theme[],
    maxTokens: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50);

    let currentChunk = '';
    let currentStart = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const estimatedTokens = (currentChunk.length + paragraph.length) / 4;

      if (estimatedTokens > maxTokens && currentChunk.length > 0) {
        // Save current chunk
        const chunkEnd = currentStart + currentChunk.length;
        chunks.push({
          resourceId,
          content: currentChunk.trim(),
          sourceSection: `Section ${chunkIndex + 1}`,
          charStart: currentStart,
          charEnd: chunkEnd,
          resourceType,
          language,
          themes,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        currentChunk = paragraph;
        currentStart = chunkEnd;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 100) {
      chunks.push({
        resourceId,
        content: currentChunk.trim(),
        sourceSection: `Section ${chunkIndex + 1}`,
        charStart: currentStart,
        charEnd: currentStart + currentChunk.length,
        resourceType,
        language,
        themes,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return chunks;
  },

  /**
   * Generate embeddings for chunks using Gemini
   */
  async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    const chunksNeedingEmbeddings = chunks.filter(chunk => !chunk.embedding);

    if (chunksNeedingEmbeddings.length === 0) {
      return chunks;
    }

    try {
      const ai = getAI();

      // Process in batches to avoid rate limits
      const batchSize = 10;
      const results: DocumentChunk[] = [...chunks];

      for (let i = 0; i < chunksNeedingEmbeddings.length; i += batchSize) {
        const batch = chunksNeedingEmbeddings.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (chunk) => {
            try {
              const response = await ai.models.embedContent({
                model: 'text-embedding-004',
                contents: chunk.content
              });

              chunk.embedding = response.embeddings?.[0]?.values || [];
            } catch (error) {
              console.error('Embedding generation error:', error);
              // Continue with other chunks even if one fails
            }
          })
        );

        // Small delay between batches
        if (i + batchSize < chunksNeedingEmbeddings.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw new ApiError(500, 'Embedding generation failed');
    }
  },

  /**
   * Store chunks in database
   */
  async storeChunks(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    // Validate all chunks
    chunks.forEach(chunk => {
      CreateChunkSchema.parse(chunk);
    });

    const collection = this.getCollection();
    const bulkOps = chunks.map(chunk => {
      if (chunk._id) {
        // Update existing
        return {
          updateOne: {
            filter: { _id: chunk._id },
            update: {
              $set: {
                ...chunk,
                updatedAt: new Date()
              }
            },
            upsert: true
          }
        };
      } else {
        // Insert new
        return {
          insertOne: {
            document: {
              ...chunk,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        };
      }
    });

    await collection.bulkWrite(bulkOps as any);
  },

  /**
   * Get all chunks for a resource
   */
  async getChunksForResource(resourceId: ObjectId): Promise<DocumentChunk[]> {
    const collection = this.getCollection();
    return collection.find({ resourceId }).toArray();
  },

  /**
   * Delete all chunks for a resource
   */
  async deleteChunksForResource(resourceId: ObjectId): Promise<number> {
    const collection = this.getCollection();
    const result = await collection.deleteMany({ resourceId });
    return result.deletedCount;
  }
};
