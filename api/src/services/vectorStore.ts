import { MongoClient, Collection } from 'mongodb';
import { config } from '../config.js';
import { DocChunk, ScoredDocChunk } from '../types.js';

let client: MongoClient | null = null;
let collection: Collection<DocChunk> | null = null;
let connectingClient: Promise<MongoClient> | null = null;

const getClient = async (): Promise<MongoClient> => {
  if (client) return client;

  if (!connectingClient) {
    const mongoClient = new MongoClient(config.mongoUri);
    connectingClient = mongoClient.connect()
      .then(conn => {
        client = conn;
        console.log('Connected to MongoDB Atlas');
        return conn;
      })
      .catch(err => {
        connectingClient = null;
        throw err;
      });
  }

  client = await connectingClient;
  return client;
};

/**
 * Establishes connection to MongoDB Atlas and returns the vector collection
 * Implements connection pooling - reuses existing connection if available
 */
export const connectMongo = async (): Promise<Collection<DocChunk>> => {
  if (collection) return collection;

  const mongoClient = await getClient();

  collection = mongoClient
    .db(config.dbName)
    .collection<DocChunk>(config.vectorCollection);

  return collection;
};

/**
 * Options for vector search
 */
interface VectorSearchOptions {
  qEmbedding: number[];      // Query embedding vector
  limit?: number;            // Number of results to return (default: 12)
  offset?: number;           // Number of documents to skip for pagination
  filters?: Record<string, unknown>; // Metadata filters (type, country, year)
}

export interface VectorSearchResult {
  results: ScoredDocChunk[];
  hasMore: boolean;
}

/**
 * Performs MongoDB Atlas Vector Search
 *
 * Uses the $vectorSearch aggregation stage with the 'embedding_index'
 * Supports pre-filtering by metadata (type, country, year)
 * Returns top-k most similar documents with scores
 *
 * @param options Search configuration
 * @returns Array of document chunks with similarity scores
 */
export const vectorSearch = async (
  options: VectorSearchOptions
): Promise<VectorSearchResult> => {
  const col = await connectMongo();
  const {
    qEmbedding,
    limit = 12,
    offset = 0,
    filters = {}
  } = options;

  const cappedOffset = Math.max(0, offset);
  const effectiveLimit = Math.max(1, limit);

  // When filters are present, dramatically increase search pool
  // to ensure we have enough results AFTER filtering
  const hasFilters = Object.keys(filters).length > 0;
  const baseSearchLimit = cappedOffset + effectiveLimit + 1;

  // If filtering, search 10x more results to account for post-filter reduction
  const searchLimit = hasFilters
    ? Math.min(baseSearchLimit * 10, 1000)  // Search up to 1000 docs when filtering
    : Math.min(baseSearchLimit, 200);        // Normal limit when no filters

  const numCandidates = hasFilters
    ? Math.min(searchLimit * 2, 2000)        // Larger candidate pool for filtering
    : Math.max(200, Math.min(800, searchLimit * 6));

  const pipeline: Record<string, unknown>[] = [];

  // Vector search stage WITHOUT pre-filters (workaround for Atlas filter issues)
  // IMPORTANT: $vectorSearch MUST be the first stage in the pipeline
  const vectorSearchStage: Record<string, unknown> = {
    $vectorSearch: {
      index: 'vector_index',              // Must match your Atlas index name
      path: 'embedding',
      queryVector: qEmbedding,
      numCandidates,
      limit: searchLimit
    }
  };

  // NOTE: Pre-filtering in $vectorSearch.filter doesn't work with current Atlas config
  // Using post-filtering with $match instead (see below)

  pipeline.push(vectorSearchStage);

  // Project only needed fields + score
  pipeline.push({
    $project: {
      title: 1,
      url: 1,
      type: 1,
      country: 1,
      year: 1,
      text: '$content',  // Map content field to text for consistency
      score: { $meta: 'vectorSearchScore' }
    }
  });

  // Apply metadata filters AFTER vector search (post-filtering workaround)
  if (Object.keys(filters).length > 0) {
    pipeline.push({ $match: filters });
  }

  // Sort by score descending
  pipeline.push({ $sort: { score: -1 } });

  if (cappedOffset > 0) {
    pipeline.push({ $skip: cappedOffset });
  }

  pipeline.push({ $limit: effectiveLimit + 1 });

  const results = await col.aggregate<ScoredDocChunk>(pipeline).toArray();
  const hasMore = results.length > effectiveLimit;
  const pageResults = hasMore ? results.slice(0, effectiveLimit) : results;

  return { results: pageResults, hasMore };
};

/**
 * Gracefully closes MongoDB connection
 * Call this on server shutdown
 */
export const closeMongo = async (): Promise<void> => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
    client = null;
    collection = null;
    connectingClient = null;
  }
};
