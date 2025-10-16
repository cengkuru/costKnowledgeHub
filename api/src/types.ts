/**
 * Shared TypeScript interfaces for the CoST Knowledge Hub API
 * These types ensure type safety across services, routes, and responses
 */

/**
 * Citation reference linking to a source document
 */
export interface Citation {
  title: string;
  url: string;
}

/**
 * Single answer bullet with supporting citations
 * Each bullet must have at least one citation
 */
export interface AnswerBullet {
  text: string;
  cites: Citation[];
}

/**
 * Complete answer synthesis result
 */
export interface AnswerPayload {
  answer: AnswerBullet[];
}

/**
 * Document chunk stored in MongoDB Atlas with vector embedding
 */
export interface DocChunk {
  _id: string;
  title: string;
  url: string;           // Full URL with anchor when possible
  type: string;          // Manual | Annex | Template | AssuranceReport | Blog Post | News Article | etc.
  country?: string;
  year?: number;
  program?: string[];
  embedding: number[];   // Vector embedding (1536 dimensions for text-embedding-3-large)
  text: string;          // The chunk content (or 'content' field in MongoDB)
  updated_at: Date;
  publishedDate?: Date;  // Publication date for blog/news articles
  author?: string;       // Article author
  tags?: string[];       // Categories/tags
  wordCount?: number;    // Content word count
  readingTime?: number;  // Reading time in minutes
  excerpt?: string;      // Short summary/excerpt
  isHistorical?: boolean; // Flag for historical/archived content
  metadata?: {
    source: string;
    crawledAt: Date;
    chunkIndex?: number;
    totalChunks?: number;
    contentType?: string;
  };
}

/**
 * Document chunk with vector search score
 */
export interface ScoredDocChunk extends DocChunk {
  score: number;
}

/**
 * Result item for frontend display
 */
export interface ResultItem {
  id: string;
  title: string;
  type: string;
  summary: string;       // 1-2 line excerpt
  country?: string;
  year?: number;
  url: string;
}

/**
 * Follow-up question suggestion
 */
export interface FollowUpQuestion {
  question: string;
  rationale: string;
  category: 'deepen' | 'broaden' | 'implement' | 'compare' | 'verify';
  searchQuery?: string;
}

/**
 * Hidden connection between documents
 */
export interface Connection {
  type: 'causal' | 'temporal' | 'thematic' | 'contradictory' | 'complementary';
  doc1Title: string;
  doc2Title: string;
  doc1Url: string;
  doc2Url: string;
  relationship: string;
  insight: string;
  confidence: number;
}

/**
 * Insight cluster revealing patterns
 */
export interface InsightCluster {
  theme: string;
  documents: string[];
  keyInsight: string;
  actionable: string;
  novelty: number;
}

export interface ExternalInsight {
  title: string;
  url: string;
  summary: string;
  stance: 'supports' | 'expands' | 'contradicts';
  publishedDate?: string;
  recencyLabel?: string;
}

export interface FreshnessSignal {
  description: string;
  emphasis: 'reinforces' | 'challenges' | 'emerging';
  sourceType: 'internal' | 'external';
  references: Citation[];
  observedAt: string;
}

export interface ContradictionAlert {
  theme: string;
  internalPosition: string;
  externalPosition: string;
  severity: 'low' | 'medium' | 'high';
  references: Citation[];
}

export interface LivingContextSummary {
  headline: string;
  synthesis: string;
  internalHighlights: Citation[];
  externalInsights: ExternalInsight[];
  freshnessSignals: FreshnessSignal[];
  contradictions: ContradictionAlert[];
}

/**
 * User intent analysis
 */
export interface UserIntent {
  category: 'research' | 'guidance' | 'examples' | 'comparison' | 'latest-updates' | 'historical' | 'implementation';
  expandedQuery: string;
  implicitNeeds: string[];
  suggestedFilters: {
    type?: string;
    yearFrom?: number;
    yearTo?: number;
    includeHistorical?: boolean;
  };
  relatedTopics: string[];
  confidence: number;
}

/**
 * Enhanced search response with AI intelligence
 */
export interface SearchResponse {
  answer: AnswerBullet[];
  items: ResultItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  // AI-powered enhancements
  intent?: UserIntent;                  // What we think they're really looking for
  followUpQuestions?: FollowUpQuestion[]; // What they should explore next
  connections?: Connection[];           // Hidden relationships we discovered
  insightClusters?: InsightCluster[];  // Patterns across all results
  knowledgeGaps?: string[];            // What's missing from results
  hiddenGems?: ResultItem[];           // Surprisingly relevant docs from lower ranks
  livingContext?: LivingContextSummary; // Hybrid internal + external synthesis
  costAlignment?: CostAlignmentReport;  // CoST DNA analysis
  temporalInsights?: TimeOracleInsights; // Time Oracle guidance
}

/**
 * Contextual filter suggestion surfaced by AI
 */
export interface FilterSuggestion {
  id: string;
  label: string;
  description: string;
  filters: {
    topic?: string;
    country?: string;
    year?: number;
    yearFrom?: number;
    yearTo?: number;
  };
  tone: 'spotlight' | 'focus' | 'expand' | 'challenge';
  confidence: number;
}

/**
 * Response payload for contextual filters endpoint
 */
export interface FilterSuggestionsResponse {
  spotlight?: FilterSuggestion;
  supporting: FilterSuggestion[];
  metadataInsights: {
    topTopics: { value: string; count: number }[];
    topCountries: { value: string; count: number }[];
    timeline: {
      newestYear?: number;
      oldestYear?: number;
      summary: string;
    };
  };
}

/**
 * Smart collection entry within a contextual grouping
 */
export interface SmartCollectionEntry {
  id: string;
  title: string;
  type: string;
  url: string;
  highlight: string;
  country?: string;
  year?: number;
}

/**
 * AI-generated smart collection grouping
 */
export interface SmartCollection {
  id: string;
  name: string;
  description: string;
  timeframe?: string;
  actionable?: string;
  novelty: number;
  items: SmartCollectionEntry[];
}

/**
 * Contextual telemetry event from the client
 */
export type ContextualTelemetryEventType =
  | 'filter_suggestion_applied'
  | 'smart_collection_entry_opened';

export interface ContextualTelemetryEvent {
  type: ContextualTelemetryEventType;
  query: string;
  filters: {
    topic?: string;
    country?: string;
    year?: number;
  };
  payload: Record<string, unknown>;
  clientTimestamp: string;
  sessionId?: string;
}

export interface ContextualTelemetryRecord extends ContextualTelemetryEvent {
  receivedAt: string;
  ip?: string;
  userAgent?: string;
}

export interface ExaContentFragment {
  snippet: string;
  position?: number;
}

/**
 * Exa search result (external API response)
 */
export interface ExaResult {
  title: string;
  url: string;
  author?: string;
  publishedDate?: string;
  text?: string;         // Snippet/content if returned by Exa
  score?: number;
  highlights?: ExaContentFragment[];
}

/**
 * Search query filters
 */
export interface SearchFilters {
  q: string;             // Query text
  topic?: string;        // Document type filter
  country?: string;
  year?: number;         // Exact year filter
  yearFrom?: number;     // Date range start
  yearTo?: number;       // Date range end
  sortBy?: 'relevance' | 'date';  // Sort order
  page?: number;
}

/**
 * Compose request for export functionality
 */
export interface ComposeRequest {
  items: string[];       // Document IDs
  bullets: AnswerBullet[];
  format: 'brief' | 'pack' | 'notes';
}

/**
 * Snippet for answer synthesis
 */
export interface Snippet {
  title: string;
  url: string;
  text: string;
}

export type CostPillarId =
  | 'disclosureTransparency'
  | 'assuranceQuality'
  | 'multiStakeholderParticipation'
  | 'socialAccountability';

export interface CostPrincipleDefinition {
  id: CostPillarId;
  name: string;
  description: string;
  guidingQuestions: string[];
  positiveSignals: string[];
  redFlags: string[];
}

export interface CostPillarScore {
  pillar: CostPillarId;
  score: number; // 0-10 scale
  rationale: string;
}

export interface CostRiskFlag {
  pillar: CostPillarId;
  risk: string;
  severity: 'low' | 'medium' | 'high';
}

export interface StakeholderBalanceIndicator {
  stakeholder: 'government' | 'privateSector' | 'civilSociety' | 'beneficiaries' | 'oversightBodies';
  emphasis: 'strong' | 'balanced' | 'underrepresented';
  notes: string;
}

export interface PowerDynamicsInsight {
  description: string;
  impactedStakeholders: string[];
  mitigationIdeas: string[];
}

export interface CostAlignmentReport {
  overallScore: number;
  pillarScores: CostPillarScore[];
  risks: CostRiskFlag[];
  stakeholderBalance: StakeholderBalanceIndicator[];
  powerDynamics: PowerDynamicsInsight[];
  generatedAt: string;
}

export interface TemporalPerspective {
  year: number;
  viewpoint: string;
  references: Citation[];
}

export interface EvolutionShift {
  phase: string;
  period: { from: number; to: number };
  shiftSummary: string;
  drivers: string[];
  representativeDocs: Citation[];
}

export interface PredictiveScenario {
  scenario: string;
  projection: string;
  confidence: number; // 0-1
  leadingIndicators: string[];
  references: Citation[];
}

export interface TimeOracleInsights {
  temporalPerspective: TemporalPerspective[];
  evolutionTimeline: EvolutionShift[];
  predictiveScenarios: PredictiveScenario[];
  recommendedActions: string[];
  generatedAt: string;
}

export interface EvolutionQueryResponse {
  topic: string;
  shifts: EvolutionShift[];
  methodologyHighlights: TemporalPerspective[];
  lastUpdated: string;
}

export interface PredictiveModelResponse {
  scenario: string;
  projections: PredictiveScenario[];
  confidenceNotes: string;
  generatedAt: string;
}
