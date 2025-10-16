import { LRUCache } from 'lru-cache';
import { config } from '../config.js';

/**
 * LRU Cache for search results
 *
 * Configuration:
 * - TTL: 60 seconds (fresh enough for most queries)
 * - Max size: 500 entries
 * - Automatic eviction of oldest entries when full
 *
 * Use case: Cache /search responses to avoid redundant vector searches
 * Note: /refresh intentionally bypasses cache for real-time results
 */
export const cache = new LRUCache<string, any>({
  ttl: config.cacheTtl,
  max: config.cacheMaxSize
});
