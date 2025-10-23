import { Resource } from '../models/resource.model';

/**
 * Utility functions for search relevance scoring
 * Uses TF-IDF algorithm with domain-specific enhancements
 */

/**
 * Simple Porter Stemmer implementation for English
 * Reduces words to their root form (e.g., "procuring" -> "procur")
 */
export function stem(word: string): string {
  if (word.length < 3) return word;

  // Remove common suffixes
  const suffixes = [
    'ing', 'ed', 'es', 's', 'ment', 'ness', 'tion', 'sion',
    'ance', 'ence', 'able', 'ible', 'ful', 'less', 'ous', 'ive'
  ];

  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}

/**
 * Preprocess query for better matching
 * - Lowercase normalization
 * - Tokenization (split into words)
 * - Remove special characters
 * - Stem words to root form
 */
export function preprocessQuery(query: string): string[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  // Normalize: lowercase and remove special characters except spaces
  const normalized = query.toLowerCase().replace(/[^\w\s]/g, ' ');

  // Tokenize: split into words
  const tokens = normalized.split(/\s+/).filter(token => token.length > 0);

  // Stem tokens
  const stemmed = tokens.map(token => stem(token));

  return stemmed;
}

/**
 * Expand query with synonyms specific to CoST domain
 */
export function expandQueryWithSynonyms(tokens: string[]): string[] {
  const synonymMap: Record<string, string[]> = {
    'guide': ['manual', 'handbook', 'tutorial', 'documentation'],
    'manual': ['guide', 'handbook', 'tutorial', 'documentation'],
    'infrastructure': ['construction', 'building', 'facility', 'structure'],
    'procurement': ['purchasing', 'acquisition', 'contracting', 'sourcing'],
    'transparency': ['disclosure', 'openness', 'accountability', 'visibility'],
    'disclosure': ['transparency', 'publication', 'reporting', 'sharing'],
    'monitoring': ['tracking', 'oversight', 'supervision', 'surveillance'],
    'community': ['public', 'citizen', 'local', 'stakeholder'],
    'data': ['information', 'statistics', 'metrics', 'records'],
    'tool': ['utility', 'instrument', 'resource', 'application'],
    'report': ['document', 'publication', 'study', 'analysis'],
    'policy': ['regulation', 'guideline', 'framework', 'standard'],
    'reform': ['improvement', 'change', 'transformation', 'modernization'],
    'standard': ['specification', 'norm', 'requirement', 'guideline']
  };

  const expanded = new Set(tokens);

  tokens.forEach(token => {
    const stemmed = stem(token);

    // Check if stemmed token has synonyms
    Object.keys(synonymMap).forEach(key => {
      if (stem(key) === stemmed) {
        synonymMap[key].forEach(syn => expanded.add(stem(syn)));
      }
    });
  });

  return Array.from(expanded);
}

/**
 * Calculate TF-IDF relevance score for a resource against a query
 *
 * @param resource - Resource to score
 * @param queryTokens - Preprocessed query tokens
 * @param allResources - All resources for IDF calculation
 * @returns Relevance score (higher is more relevant)
 */
export function calculateRelevanceScore(
  resource: Resource,
  queryTokens: string[],
  allResources: Resource[]
): number {
  if (queryTokens.length === 0) return 0;

  let score = 0;
  const totalDocs = allResources.length;

  // Expand query with synonyms for better matching
  const expandedTokens = expandQueryWithSynonyms(queryTokens);

  // Create searchable text from resource
  const titleText = Object.values(resource.title).join(' ').toLowerCase();
  const descText = Object.values(resource.description).join(' ').toLowerCase();
  const tagsText = resource.tags.join(' ').toLowerCase();
  const combinedText = `${titleText} ${descText} ${tagsText}`;

  // Preprocess resource text
  const resourceTokens = preprocessQuery(combinedText);

  // Calculate TF-IDF for each query token
  expandedTokens.forEach(queryToken => {
    // Term Frequency (TF) - how often token appears in this resource
    const tf = resourceTokens.filter(t => t === queryToken).length / resourceTokens.length;

    // Document Frequency (DF) - how many resources contain this token
    const df = allResources.filter(r => {
      const rText = `${Object.values(r.title).join(' ')} ${Object.values(r.description).join(' ')} ${r.tags.join(' ')}`.toLowerCase();
      const rTokens = preprocessQuery(rText);
      return rTokens.includes(queryToken);
    }).length;

    // Inverse Document Frequency (IDF)
    const idf = df > 0 ? Math.log(totalDocs / df) : 0;

    // TF-IDF score
    const tfidf = tf * idf;

    // Boost scores based on field importance
    let fieldBoost = 1;

    // Title matches are most important (3x boost)
    if (preprocessQuery(titleText).includes(queryToken)) {
      fieldBoost = 3;
    }
    // Tag matches are important (2x boost)
    else if (preprocessQuery(tagsText).includes(queryToken)) {
      fieldBoost = 2;
    }
    // Description matches are standard (1x boost)

    score += tfidf * fieldBoost;
  });

  // Bonus for exact phrase match in title
  const exactPhraseInTitle = Object.values(resource.title).some(title =>
    title.toLowerCase().includes(queryTokens.join(' '))
  );
  if (exactPhraseInTitle) {
    score *= 1.5; // 50% bonus for exact phrase match
  }

  // Bonus for matching all query tokens
  const matchedAllTokens = queryTokens.every(token =>
    resourceTokens.includes(token)
  );
  if (matchedAllTokens && queryTokens.length > 1) {
    score *= 1.2; // 20% bonus for matching all terms
  }

  return score;
}

/**
 * Score and rank resources by relevance to query
 *
 * @param resources - Resources to score
 * @param query - Search query
 * @returns Resources sorted by relevance score (highest first)
 */
export function scoreAndRankResources(
  resources: Resource[],
  query: string
): Array<Resource & { relevanceScore: number }> {
  if (!query || query.trim().length === 0) {
    // No query - return as-is with zero scores
    return resources.map(r => ({ ...r, relevanceScore: 0 }));
  }

  const queryTokens = preprocessQuery(query);

  // Calculate relevance score for each resource
  const scoredResources = resources.map(resource => ({
    ...resource,
    relevanceScore: calculateRelevanceScore(resource, queryTokens, resources)
  }));

  // Sort by relevance score (highest first)
  return scoredResources.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Check if a resource matches the search query
 * More intelligent than simple substring matching
 */
export function matchesSearchQuery(resource: Resource, query: string): boolean {
  if (!query || query.trim().length === 0) return true;

  const queryTokens = preprocessQuery(query);
  const expandedTokens = expandQueryWithSynonyms(queryTokens);

  const titleText = Object.values(resource.title).join(' ').toLowerCase();
  const descText = Object.values(resource.description).join(' ').toLowerCase();
  const tagsText = resource.tags.join(' ').toLowerCase();
  const combinedText = `${titleText} ${descText} ${tagsText}`;

  const resourceTokens = preprocessQuery(combinedText);

  // Resource matches if at least one expanded query token is present
  return expandedTokens.some(token => resourceTokens.includes(token));
}
