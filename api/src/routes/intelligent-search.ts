/**
 * Intelligent Search Route - Context is EVERYTHING
 *
 * This is NOT just search - it's an AI research assistant that:
 * 1. BEFORE search: Predicts intent, expands query, suggests filters
 * 2. DURING search: Multi-strategy retrieval (vector + hidden gems)
 * 3. AFTER search: Connections, insights, follow-ups, gap analysis
 *
 * Makes connections that were NEVER possible before AI.
 */

import { Router } from 'express';
import { validateQuery } from '../middlewares/validateQuery.js';
import { searchLimiter } from '../middlewares/rateLimit.js';
import { embed } from '../services/embedder.js';
import { vectorSearch } from '../services/vectorStore.js';
import { synthesizeAnswer } from '../services/answer.js';
import { generateSummaries } from '../services/summarizer.js';
import { cache } from '../services/cache.js';
import {
  analyzeIntent,
  expandQuery,
  predictNextNeeds
} from '../services/intent-analyzer.js';
import {
  discoverConnections,
  extractInsightClusters,
  findHiddenGems
} from '../services/connection-engine.js';
import {
  generateFollowUps,
  identifyKnowledgeGaps,
  suggestBetterSearches
} from '../services/follow-up-generator.js';
import { buildLivingContext } from '../services/living-context.js';
import { analyzeCostAlignment } from '../services/cost-dna-analyzer.js';
import {
  buildTimeOracleInsights,
  getEvolutionOverview,
  projectPredictiveScenario
} from '../services/time-oracle.js';
import {
  SearchResponse,
  SearchFilters,
  ResultItem,
  LivingContextSummary,
  CostAlignmentReport,
  TimeOracleInsights
} from '../types.js';

export const intelligentSearch = Router();
const PAGE_SIZE = 10;

/**
 * GET /intelligent-search
 *
 * Hyper-intelligent search endpoint with:
 * - Intent prediction
 * - Query expansion
 * - Hidden connection discovery
 * - Follow-up question generation
 * - Knowledge gap identification
 * - Insight extraction
 *
 * Query params (same as /search):
 * - q: Search query (required)
 * - topic, country, year, yearFrom, yearTo, sortBy, page
 * - enhance: 'full' | 'fast' | 'minimal' (default: 'fast')
 *
 * Response includes ALL the intelligence layers
 */
intelligentSearch.get('/', searchLimiter, validateQuery, async (req, res, next) => {
  try {
    const filters = req.query as unknown as SearchFilters;
    const { q, topic, country, year, yearFrom, yearTo, sortBy, page: rawPage } = filters;
    const page = Math.max(Number(rawPage) || 1, 1);
    const enhance = (req.query.enhance as string) || 'fast';

    console.log(`\n🧠 INTELLIGENT SEARCH: "${q}" (enhancement: ${enhance})`);

    const cacheKey = [
      'intelligent-search',
      q,
      topic ?? '',
      country ?? '',
      year ?? '',
      yearFrom ?? '',
      yearTo ?? '',
      sortBy ?? 'relevance',
      page,
      enhance
    ].join('|');

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache hit');
      return res.json(cached);
    }

    // === PHASE 1: BEFORE SEARCH - Understand Intent ===
    console.log('📊 Phase 1: Analyzing intent...');
    const intentPromise = analyzeIntent(String(q));

    // === PHASE 2: DURING SEARCH - Multi-strategy Retrieval ===
    console.log('🔍 Phase 2: Multi-strategy search...');

    // Generate embedding for vector search
    const qEmbedding = await embed(String(q)) as number[];

    // Build metadata filters
    const metadataFilters: Record<string, unknown> = {};
    if (topic) metadataFilters.type = topic;
    if (country) metadataFilters.country = country;
    if (year) {
      metadataFilters.year = Number(year);
    } else if (yearFrom || yearTo) {
      const dateFilter: Record<string, number> = {};
      if (yearFrom) dateFilter.$gte = Number(yearFrom);
      if (yearTo) dateFilter.$lte = Number(yearTo);
      if (Object.keys(dateFilter).length > 0) {
        metadataFilters.year = dateFilter;
      }
    }

    const offset = (page - 1) * PAGE_SIZE;

    // Primary vector search - get MORE results for hidden gem discovery
    const searchLimit = enhance === 'full' ? 50 : 30;
    const { results: allHits, hasMore } = await vectorSearch({
      qEmbedding,
      limit: searchLimit,
      offset,
      filters: metadataFilters
    });

    const primaryHits = allHits.slice(0, PAGE_SIZE);

    // Prepare snippets for AI processing
    const snippets = primaryHits.map(h => ({
      title: h.title,
      url: h.url,
      text: h.text
    }));

    // === PHASE 3: AI PROCESSING - Parallel Intelligence ===
    console.log('🤖 Phase 3: AI intelligence layers...');

    const [
      intent,
      answerPayload,
      summaries,
      connections,
      insightClusters,
      followUpQuestions,
      knowledgeGaps
    ] = await Promise.all([
      intentPromise,
      synthesizeAnswer(String(q), snippets),
      generateSummaries(primaryHits.map(h => ({
        title: h.title,
        text: h.text || '',
        type: h.type
      }))),
      enhance === 'minimal' ? Promise.resolve([]) : discoverConnections(primaryHits),
      enhance === 'full' ? extractInsightClusters(allHits) : Promise.resolve([]),
      enhance === 'minimal' ? Promise.resolve([]) : generateFollowUps(String(q), primaryHits.map(h => ({
        id: String(h._id),
        title: h.title,
        type: h.type,
        summary: h.text?.slice(0, 180) + '...' || '',
        country: h.country,
        year: h.year,
        url: h.url
      }))),
      enhance === 'full' ? identifyKnowledgeGaps(String(q), primaryHits.map(h => ({
        id: String(h._id),
        title: h.title,
        type: h.type,
        summary: '',
        country: h.country,
        year: h.year,
        url: h.url
      }))) : Promise.resolve([])
    ]);

    // Find hidden gems (only in full mode)
    const hiddenGemsPromise = enhance === 'full'
      ? findHiddenGems(String(q), allHits)
      : Promise.resolve([]);

    const hiddenGemDocs = await hiddenGemsPromise;

    const shouldRunSuperpowers = enhance === 'hybrid';
    const shouldRunCostDNA = enhance !== 'minimal';

    let livingContextSummary: LivingContextSummary | undefined;
    let timeOracleInsights: TimeOracleInsights | undefined;
    let costAlignmentReport: CostAlignmentReport | undefined;

    if (shouldRunSuperpowers) {
      console.log('🌐 Running Living Context Engine...');
      const livingContextPayload = await buildLivingContext(String(q), allHits);
      livingContextSummary = livingContextPayload.summary;
      console.log(`🌐 Integrated ${livingContextPayload.externalResults.length} external sources`);

      console.log('🕰️ Running Time Oracle...');
      timeOracleInsights = await buildTimeOracleInsights(String(q), allHits, {
        livingContext: livingContextSummary
      });
      console.log(`🕰️ Time Oracle produced ${timeOracleInsights.predictiveScenarios.length} scenarios`);
    }

    if (shouldRunCostDNA) {
      console.log('🧬 Running CoST DNA Analyzer...');
      costAlignmentReport = await analyzeCostAlignment({
        query: String(q),
        answer: answerPayload.answer ?? [],
        livingContext: livingContextSummary,
        temporalInsights: timeOracleInsights
      });
      console.log(`🧬 CoST DNA overall score: ${costAlignmentReport.overallScore.toFixed(1)}/10`);
    }

    const answerBullets = answerPayload.answer ?? [];

    console.log(`✅ Found ${primaryHits.length} primary results`);
    console.log(`💎 Found ${hiddenGemDocs.length} hidden gems`);
    console.log(`🔗 Discovered ${connections.length} connections`);
    console.log(`💡 Extracted ${insightClusters.length} insight clusters`);
    console.log(`❓ Generated ${followUpQuestions.length} follow-up questions`);
    if (livingContextSummary) {
      console.log('🌐 Living context prepared.');
    }
    if (timeOracleInsights) {
      console.log('🕰️ Time Oracle insights ready.');
    }

    // Format primary results
    const items: ResultItem[] = primaryHits.map((h, i) => ({
      id: String(h._id),
      title: h.title,
      type: h.type,
      summary: summaries[i]?.summary || h.title,
      country: h.country,
      year: h.year,
      url: h.url
    }));

    // Format hidden gems
    const hiddenGems: ResultItem[] = await Promise.all(
      hiddenGemDocs.map(async (h) => {
        const gemSummaries = await generateSummaries([{
          title: h.title,
          text: h.text || '',
          type: h.type
        }]);

        return {
          id: String(h._id),
          title: h.title,
          type: h.type,
          summary: gemSummaries[0]?.summary || h.title,
          country: h.country,
          year: h.year,
          url: h.url
        };
      })
    );

    // Build enhanced response
    const response: SearchResponse = {
      answer: answerBullets,
      items,
      page,
      pageSize: PAGE_SIZE,
      hasMore,
      // AI Intelligence Layers
      intent,
      followUpQuestions: followUpQuestions.slice(0, 5),
      connections: connections.slice(0, 5),
      insightClusters: insightClusters.slice(0, 3),
      knowledgeGaps: knowledgeGaps.slice(0, 4),
      hiddenGems: hiddenGems.slice(0, 3),
      livingContext: livingContextSummary,
      costAlignment: costAlignmentReport,
      temporalInsights: timeOracleInsights
    };

    // Cache for 60 seconds
    cache.set(cacheKey, response);

    console.log('🎉 Intelligent search complete!\n');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /intelligent-search/intent
 *
 * Analyze query intent BEFORE searching
 * Useful for autocomplete/search-as-you-type features
 */
intelligentSearch.get('/intent', searchLimiter, async (req, res, next) => {
  try {
    const query = String(req.query.q || '');
    if (query.length < 3) {
      return res.json({ error: 'Query too short' });
    }

    const intent = await analyzeIntent(query);
    res.json({ intent });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /intelligent-search/expand
 *
 * Get query variations for better search
 */
intelligentSearch.get('/expand', searchLimiter, async (req, res, next) => {
  try {
    const query = String(req.query.q || '');
    if (query.length < 3) {
      return res.json({ error: 'Query too short' });
    }

    const intent = await analyzeIntent(query);
    const variations = await expandQuery(query, intent);

    res.json({
      original: query,
      intent: intent.category,
      variations,
      expandedQuery: intent.expandedQuery
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /intelligent-search/evolution
 *
 * Returns methodology evolution timeline for a given topic
 */
intelligentSearch.get('/evolution', searchLimiter, async (req, res, next) => {
  try {
    const topicRaw = (req.query.topic ?? req.query.q ?? '').toString().trim();
    if (!topicRaw) {
      return res.status(400).json({ error: 'Missing required topic parameter' });
    }

    const qEmbedding = await embed(topicRaw) as number[];

    const metadataFilters: Record<string, unknown> = {};
    if (req.query.country) {
      metadataFilters.country = String(req.query.country);
    }
    if (req.query.yearFrom || req.query.yearTo) {
      const yearFilter: Record<string, number> = {};
      if (req.query.yearFrom) {
        yearFilter.$gte = Number(req.query.yearFrom);
      }
      if (req.query.yearTo) {
        yearFilter.$lte = Number(req.query.yearTo);
      }
      metadataFilters.year = yearFilter;
    }

    const { results } = await vectorSearch({
      qEmbedding,
      limit: 40,
      filters: metadataFilters
    });

    const evolution = await getEvolutionOverview(topicRaw, results, { topic: topicRaw });
    res.json(evolution);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /intelligent-search/predict
 *
 * Generates predictive scenario projections using the Time Oracle
 */
intelligentSearch.get('/predict', searchLimiter, async (req, res, next) => {
  try {
    const scenario = String(req.query.scenario || '').trim();
    if (!scenario) {
      return res.status(400).json({ error: 'Missing required scenario parameter' });
    }

    const topic = String(req.query.topic || scenario).trim();
    const queryBasis = topic ? `${topic} ${scenario}` : scenario;

    const qEmbedding = await embed(queryBasis) as number[];

    const metadataFilters: Record<string, unknown> = {};
    if (req.query.country) {
      metadataFilters.country = String(req.query.country);
    }
    if (req.query.yearFrom || req.query.yearTo) {
      const yearFilter: Record<string, number> = {};
      if (req.query.yearFrom) {
        yearFilter.$gte = Number(req.query.yearFrom);
      }
      if (req.query.yearTo) {
        yearFilter.$lte = Number(req.query.yearTo);
      }
      metadataFilters.year = yearFilter;
    }

    const { results } = await vectorSearch({
      qEmbedding,
      limit: 40,
      filters: metadataFilters
    });

    const prediction = await projectPredictiveScenario(scenario, results, {
      topic
    });

    res.json(prediction);
  } catch (error) {
    next(error);
  }
});
