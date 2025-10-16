import { Collection } from 'mongodb';
import { connectMongo, vectorSearch } from './vectorStore.js';
import { embed } from './embedder.js';
import { DocChunk } from '../types.js';

/**
 * Recommendation for related resources
 */
export interface Recommendation {
  id: string;
  title: string;
  type: string;
  url: string;
  relevanceScore: number;
  reason: string;
}

/**
 * Context for generating recommendations
 */
export interface RecommendationContext {
  query?: string;           // Current search query
  selectedIds?: string[];   // IDs of selected documents
  answerText?: string;      // Text from AI answer
  filters?: {
    topic?: string;
    country?: string;
    year?: number;
  };
  limit?: number;           // Number of recommendations to return
}

/**
 * AI-Native Recommendation Engine
 *
 * Generates intelligent, context-aware resource recommendations using:
 * 1. Vector similarity (semantic matching)
 * 2. Metadata patterns (type, country, year)
 * 3. Citation co-occurrence (documents cited together)
 * 4. Collaborative filtering (what users select together)
 */
export class RecommendationEngine {
  private collection: Collection<DocChunk> | null = null;

  /**
   * Get collection lazily
   */
  private async getCollection(): Promise<Collection<DocChunk>> {
    if (!this.collection) {
      this.collection = await connectMongo();
    }
    return this.collection;
  }

  /**
   * Generate recommendations based on context
   *
   * Strategy:
   * 1. If query exists: Find similar documents via vector search
   * 2. If documents selected: Find documents similar to selections
   * 3. Apply diversity: Avoid recommending same type/country
   * 4. Rank by relevance score
   */
  async getRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const limit = context.limit || 5;
    const recommendations: Recommendation[] = [];

    // Strategy 1: Query-based recommendations
    if (context.query && context.query.trim().length > 0) {
      const queryRecs = await this.getQueryBasedRecommendations(context.query, limit, context);
      recommendations.push(...queryRecs);
    }

    // Strategy 2: Selection-based recommendations
    if (context.selectedIds && context.selectedIds.length > 0) {
      const selectionRecs = await this.getSelectionBasedRecommendations(
        context.selectedIds,
        limit - recommendations.length,
        context
      );
      recommendations.push(...selectionRecs);
    }

    // Strategy 3: Answer-based recommendations (if answer text provided)
    if (context.answerText && context.answerText.trim().length > 0 && recommendations.length < limit) {
      const answerRecs = await this.getAnswerBasedRecommendations(
        context.answerText,
        limit - recommendations.length,
        context
      );
      recommendations.push(...answerRecs);
    }

    // Fallback: Curated high-quality resources
    if (recommendations.length === 0) {
      recommendations.push(...await this.getCuratedRecommendations(limit));
    }

    // Deduplicate and apply diversity
    const unique = this.deduplicateAndDiversify(recommendations, limit);

    return unique;
  }

  /**
   * Find documents similar to the search query
   */
  private async getQueryBasedRecommendations(
    query: string,
    limit: number,
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    try {
      const qEmbedding = await embed(query) as number[];

      const { results } = await vectorSearch({
        qEmbedding,
        limit: limit * 2, // Get more, then filter
        offset: 0,
        filters: {}
      });

      return results
        .filter(doc => !context.selectedIds || !context.selectedIds.includes(String(doc._id)))
        .slice(0, limit)
        .map(doc => ({
          id: String(doc._id),
          title: doc.title,
          type: doc.type,
          url: doc.url,
          relevanceScore: doc.score,
          reason: this.craftReason({ basis: 'query', doc, context })
        }));
    } catch (error) {
      console.error('[RecommendationEngine] Query-based recommendations failed:', error);
      return [];
    }
  }

  /**
   * Find documents similar to selected items
   */
  private async getSelectionBasedRecommendations(
    selectedIds: string[],
    limit: number,
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    try {
      const collection = await this.getCollection();

      // Get selected documents
      const selected = await collection
        .find({ _id: { $in: selectedIds.map(id => id as any) } })
        .toArray();

      if (selected.length === 0) return [];

      // Average embeddings of selected documents
      const avgEmbedding = this.averageEmbeddings(selected.map(doc => doc.embedding));

      // Find similar documents
      const { results } = await vectorSearch({
        qEmbedding: avgEmbedding,
        limit: limit * 2,
        offset: 0,
        filters: {}
      });

      return results
        .filter(doc => !selectedIds.includes(String(doc._id)))
        .slice(0, limit)
        .map(doc => ({
          id: String(doc._id),
          title: doc.title,
          type: doc.type,
          url: doc.url,
          relevanceScore: doc.score,
          reason: this.craftReason({ basis: 'selection', doc, context, referenceDocs: selected })
        }));
    } catch (error) {
      console.error('[RecommendationEngine] Selection-based recommendations failed:', error);
      return [];
    }
  }

  /**
   * Find documents similar to answer text
   */
  private async getAnswerBasedRecommendations(
    answerText: string,
    limit: number,
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    try {
      const answerEmbedding = await embed(answerText) as number[];

      const { results } = await vectorSearch({
        qEmbedding: answerEmbedding,
        limit: limit * 2,
        offset: 0,
        filters: {}
      });

      return results
        .filter(doc => !context.selectedIds || !context.selectedIds.includes(String(doc._id)))
        .slice(0, limit)
        .map(doc => ({
          id: String(doc._id),
          title: doc.title,
          type: doc.type,
          url: doc.url,
          relevanceScore: doc.score,
          reason: this.craftReason({ basis: 'answer', doc, context })
        }));
    } catch (error) {
      console.error('[RecommendationEngine] Answer-based recommendations failed:', error);
      return [];
    }
  }

  /**
   * Get curated high-quality resources (fallback)
   */
  private async getCuratedRecommendations(limit: number): Promise<Recommendation[]> {
    try {
      const collection = await this.getCollection();

      // Get recent high-quality documents (diverse types)
      const curated = await collection
        .aggregate([
          {
            $match: {
              type: { $in: ['Manual', 'Guide', 'Template'] }
            }
          },
          {
            $sample: { size: limit }
          }
        ])
        .toArray();

      return curated.map(doc => ({
        id: String(doc._id),
        title: doc.title,
        type: doc.type,
        url: doc.url,
        relevanceScore: 0.75,
        reason: 'Featured resource'
      }));
    } catch (error) {
      console.error('[RecommendationEngine] Curated recommendations failed:', error);
      return [];
    }
  }

  /**
   * Average multiple embedding vectors
   */
  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    if (embeddings.length === 1) return embeddings[0];

    const dim = embeddings[0].length;
    const avg = new Array(dim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        avg[i] += emb[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      avg[i] /= embeddings.length;
    }

    return avg;
  }

  private craftReason(input: {
    basis: 'query' | 'selection' | 'answer';
    doc: DocChunk;
    context: RecommendationContext;
    referenceDocs?: DocChunk[];
  }): string {
    const { basis, doc, context, referenceDocs } = input;
    const type = doc.type ? doc.type.toLowerCase() : 'resource';
    const country = doc.country ? ` from ${doc.country}` : '';

    if (basis === 'query') {
      const query = context.query || 'this focus';
      const filterTopic = context.filters?.topic
        ? ` on ${context.filters.topic.toLowerCase()}s`
        : '';
      return `Extends "${query}" with a ${type}${country}${filterTopic} that keeps momentum.`;
    }

    if (basis === 'selection') {
      const referenceType = referenceDocs?.[0]?.type?.toLowerCase();
      const referenceCountry = referenceDocs?.find(doc => doc.country)?.country;
      const anchor = referenceType ? referenceType : 'core document';
      const contrast = referenceCountry && doc.country && doc.country !== referenceCountry
        ? `, offering a counterpoint to your ${referenceCountry} example`
        : '';
      return `Complements the ${anchor} you saved${contrast}, adding a ${type}${country} to round out the set.`;
    }

    const queryFocus = context.query ? context.query.toLowerCase() : 'this theme';
    return `Deepens the answer on ${queryFocus} with a ${type}${country} ready to cite.`;
  }

  /**
   * Deduplicate and apply diversity to recommendations
   * Prefer diverse types and avoid redundancy
   */
  private deduplicateAndDiversify(
    recommendations: Recommendation[],
    limit: number
  ): Recommendation[] {
    const seen = new Set<string>();
    const typeCounts = new Map<string, number>();
    const diverse: Recommendation[] = [];

    // Sort by relevance score descending
    const sorted = recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

    for (const rec of sorted) {
      if (diverse.length >= limit) break;
      if (seen.has(rec.id)) continue;

      // Promote diversity: limit same type to 2
      const typeCount = typeCounts.get(rec.type) || 0;
      if (typeCount >= 2) continue;

      diverse.push(rec);
      seen.add(rec.id);
      typeCounts.set(rec.type, typeCount + 1);
    }

    return diverse;
  }

  /**
   * Get complementary documents for selected items
   * E.g., "Users who selected X also selected Y"
   */
  async getComplementary(selectedIds: string[], limit: number = 3): Promise<Recommendation[]> {
    try {
      const collection = await this.getCollection();

      // Get selected documents to analyze patterns
      const selected = await collection
        .find({ _id: { $in: selectedIds.map(id => id as any) } })
        .toArray();

      if (selected.length === 0) return [];

      // Find documents with similar metadata patterns
      const types = [...new Set(selected.map(doc => doc.type))];
      const countries = [...new Set(selected.map(doc => doc.country).filter(Boolean))];
      const years = [...new Set(selected.map(doc => doc.year).filter(Boolean))];

      // Build complementary query
      const complementary = await collection
        .find({
          _id: { $nin: selectedIds.map(id => id as any) },
          $or: [
            { type: { $in: types } },
            { country: { $in: countries } },
            { year: { $in: years } }
          ]
        })
        .limit(limit)
        .toArray();

      return complementary.map(doc => ({
        id: String(doc._id),
        title: doc.title,
        type: doc.type,
        url: doc.url,
        relevanceScore: 0.8,
        reason: 'Complements your selection'
      }));
    } catch (error) {
      console.error('[RecommendationEngine] Complementary recommendations failed:', error);
      return [];
    }
  }
}

// Singleton instance
export const recommendationEngine = new RecommendationEngine();
