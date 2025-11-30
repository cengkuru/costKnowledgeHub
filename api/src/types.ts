export type Language = 'en' | 'es' | 'pt';

export enum ResourceCategory {
    ALL = 'All Topics',
    OC4IDS = 'OC4IDS',
    ASSURANCE = 'Assurance',
    INDEX = 'Infrastructure Index',
    GUIDANCE = 'Guidance Notes',
}

export enum ResourceType {
    ALL = 'All Types',
    DOCUMENTATION = 'Documentation',
    TOOL = 'Tool',
    GUIDE = 'Guide',
    TEMPLATE = 'Template',
    VISUALIZATION = 'Visualization',
    DATASET = 'Dataset',
    LIBRARY = 'Library/Code',
}

export interface ResourceItem {
    id: string;
    title: string;
    description: string;
    url: string;
    category: ResourceCategory;
    type: ResourceType;
    date: string; // ISO Date string YYYY-MM-DD
}

export interface SearchResultGroup {
    title: string;
    description: string;
    resourceIds: string[];
}

// ============================================================================
// DOCUMENT & SEARCH TYPES
// ============================================================================

export interface DocChunk {
    _id?: string;
    title: string;
    url: string;
    text: string;
    embedding?: number[];
    type?: string;
    country?: string;
    year?: number;
    metadata?: Record<string, any>;
}

export interface ScoredDocChunk extends DocChunk {
    score: number;
    type?: string;
    country?: string;
    year?: number;
}

export interface Snippet {
    title: string;
    url: string;
    text: string;
    score?: number;
}

export interface AnswerBullet {
    text: string;
    citations?: number[];
    cites?: { title: string; url: string; }[];
}

export interface SearchFilters {
    q?: string;
    topic?: string;
    country?: string;
    year?: string;
    yearFrom?: string;
    yearTo?: string;
    sortBy?: 'relevance' | 'date';
    page?: string;
    resourceTypes?: string[];
    themes?: string[];
    countryPrograms?: string[];
    language?: string;
    audience?: string[];
    dateRange?: { from?: Date; to?: Date };
}

export interface SearchResponse {
    answer?: AnswerBullet[];
    items?: ResultItem[];
    results?: ResultItem[];
    total?: number;
    facets?: Record<string, any>;
    page?: number;
    pageSize?: number;
    totalPages?: number;
    hasMore?: boolean;
    intent?: any;
    followUpQuestions?: string[];
    connections?: any;
    insightClusters?: any;
    knowledgeGaps?: any;
    hiddenGems?: any;
    livingContext?: LivingContextSummary;
    costAlignment?: CostAlignmentReport;
    temporalInsights?: TimeOracleInsights;
}

export interface ResultItem {
    id?: string;
    title: string;
    url: string;
    description?: string;
    snippet?: string;
    summary?: string;
    score?: number;
    type?: string;
    country?: string;
    year?: number;
    metadata?: Record<string, any>;
}

// ============================================================================
// COMPOSE / PDF TYPES
// ============================================================================

export interface ComposeRequest {
    query: string;
    bullets: AnswerBullet[];
    sources: Snippet[];
    format?: string;
    items?: any[];
    title?: string;
}

// ============================================================================
// TELEMETRY TYPES
// ============================================================================

export interface ContextualTelemetryEvent {
    eventType: string;
    type?: string;
    timestamp: Date;
    clientTimestamp?: string;
    userId?: string;
    sessionId?: string;
    query?: string;
    filters?: any;
    payload?: any;
    data?: Record<string, any>;
}

export interface ContextualTelemetryRecord {
    _id?: string;
    type?: string;
    query?: string;
    filters?: any;
    events?: ContextualTelemetryEvent[];
    sessionId?: string;
    userId?: string;
    startTime?: Date;
    endTime?: Date;
    metadata?: Record<string, any>;
    payload?: any;
    clientTimestamp?: string;
    receivedAt?: string;
    ip?: string;
    userAgent?: string;
}

// ============================================================================
// FILTER SUGGESTION TYPES
// ============================================================================

export interface FilterSuggestion {
    id?: string;
    field?: string;
    value?: string | number;
    label: string;
    confidence: number;
    description?: string;
    filters?: any;
    tone?: 'spotlight' | 'focus' | 'expand' | 'challenge';
}

export interface FilterSuggestionsResponse {
    suggestions?: FilterSuggestion[];
    query?: string;
    spotlight?: FilterSuggestion;
    supporting?: FilterSuggestion[];
    metadataInsights?: {
        topTopics?: { value: string; count: number }[];
        topCountries?: { value: string; count: number }[];
        timeline?: {
            newestYear?: number;
            oldestYear?: number;
            summary: string;
        };
    };
}

// ============================================================================
// COST DNA / ALIGNMENT TYPES
// ============================================================================

export type CostPillarId = 'disclosure' | 'assurance' | 'social_accountability' | 'reforms' | 'capacity_building' | 'disclosureTransparency' | 'assuranceQuality' | 'multiStakeholderParticipation' | 'socialAccountability';

export interface CostPillarAlignment {
    pillarId: CostPillarId;
    pillarName: string;
    score: number;
    evidence: string[];
}

export interface CostPillarScore {
    pillar: CostPillarId;
    score: number;
    rationale: string;
}

export interface CostRisk {
    pillar: CostPillarId;
    severity: 'low' | 'medium' | 'high';
    description?: string;
}

export interface CostAlignmentReport {
    overallScore: number;
    pillars?: CostPillarAlignment[];
    pillarScores?: CostPillarScore[];
    summary?: string;
    recommendations?: string[];
    risks?: CostRisk[];
    stakeholderBalance?: any;
    powerDynamics?: any;
    generatedAt?: string;
}

// ============================================================================
// LIVING CONTEXT TYPES
// ============================================================================

export interface Citation {
    index?: number;
    title: string;
    url: string;
    snippet?: string;
}

export interface LivingContextSummary {
    summary?: string;
    citations?: Citation[];
    relatedTopics?: string[];
    timestamp?: Date;
    synthesis?: string;
    internalHighlights?: any[];
    externalInsights?: any[];
    freshnessSignals?: any[];
    contradictions?: any[];
    headline?: string;
}

// ============================================================================
// EXA CLIENT TYPES
// ============================================================================

export interface ExaContentFragment {
    text?: string;
    url?: string;
    title?: string;
    snippet?: string;
    position?: number;
}

export interface ExaResult {
    title: string;
    url: string;
    score?: number;
    text?: string;
    highlights?: string[] | ExaContentFragment[];
    publishedDate?: string;
}

// ============================================================================
// TIME ORACLE / EVOLUTION TYPES
// ============================================================================

export interface TemporalPerspective {
    timeframe: 'past' | 'present' | 'future';
    description: string;
    confidence: number;
    year?: number;
    viewpoint?: string;
    references?: { title: string; url: string; }[];
}

export interface EvolutionShift {
    from: string;
    to: string;
    significance: number;
    evidence: string[];
    phase?: any;
    period?: { from: any; to: any; };
    shiftSummary?: any;
    drivers?: any;
    representativeDocs?: any;
}

export interface EvolutionQueryResponse {
    shifts: EvolutionShift[];
    timeline: TemporalPerspective[];
    summary: string;
    topic?: string;
    methodologyHighlights?: string[];
    lastUpdated?: Date;
}

export interface PredictiveScenario {
    scenario: string;
    probability?: number;
    timeframe?: string;
    implications?: string[];
    projection?: any;
    confidence?: number;
    leadingIndicators?: string[];
    references?: { title: string; url: string }[];
}

export interface PredictiveModelResponse {
    scenarios?: PredictiveScenario[];
    scenario?: string;
    confidence?: number;
    methodology?: string;
    projections?: PredictiveScenario[];
    generatedAt?: string;
    confidenceNotes?: string;
}

export interface TimeOracleInsights {
    temporal?: TemporalPerspective[];
    evolution?: EvolutionQueryResponse;
    predictions?: PredictiveModelResponse;
    predictiveScenarios?: PredictiveScenario[];
    summary?: string;
    recommendedActions?: string[];
    evolutionTimeline?: any;
    temporalPerspective?: any;
    generatedAt?: string;
}

// ============================================================================
// SMART COLLECTIONS TYPES
// ============================================================================

export interface SmartCollectionEntry {
    id?: string;
    resourceId?: string;
    title: string;
    url: string;
    relevanceScore?: number;
    reason?: string;
    year?: number;
    type?: string;
    highlight?: string;
    country?: string;
}

export interface SmartCollection {
    id: string;
    name: string;
    description: string;
    entries?: SmartCollectionEntry[];
    items?: SmartCollectionEntry[];
    createdAt?: Date;
    updatedAt?: Date;
    timeframe?: string;
    actionable?: string;
    novelty?: number;
}

// ============================================================================
// COST PRINCIPLE TYPES
// ============================================================================

export interface CostPrincipleDefinition {
    id: string;
    name: string;
    description: string;
    guidingQuestions: string[];
    positiveSignals: string[];
    redFlags: string[];
}
