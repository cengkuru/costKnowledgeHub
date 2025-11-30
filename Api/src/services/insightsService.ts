/**
 * Insights Service
 * Computes weekly usage insights from the knowledge hub
 */

import { getDb } from '../config/database';
import { chat } from './claudeService';
import {
  InsightsReport,
  EngagementMetrics,
  TopResource,
  TrendingTopic,
  ContentGap,
  StaleContent,
  AIUsageMetrics,
  HiddenGem,
  MostCitedResource,
  EmailRecipient,
  DEFAULT_INSIGHTS_CONFIG,
  InsightsServiceConfig,
} from '../types/insightsTypes';

const RESOURCES_COLLECTION = 'resources';
const USERS_COLLECTION = 'users';

function getWeekDates(): { weekAgo: Date; twoWeeksAgo: Date; now: Date } {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  return { weekAgo, twoWeeksAgo, now };
}

function formatWeekRange(): string {
  const { weekAgo, now } = getWeekDates();
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const yearOptions: Intl.DateTimeFormatOptions = { year: 'numeric' };

  const start = weekAgo.toLocaleDateString('en-US', options);
  const end = now.toLocaleDateString('en-US', options);
  const year = now.toLocaleDateString('en-US', yearOptions);

  return `${start} - ${end}, ${year}`;
}

/**
 * Compute engagement patterns: top resources, trending topics, week-over-week changes
 */
async function computeEngagementPatterns(
  config: InsightsServiceConfig = DEFAULT_INSIGHTS_CONFIG
): Promise<EngagementMetrics> {
  const db = await getDb();
  const collection = db.collection(RESOURCES_COLLECTION);
  const { weekAgo, twoWeeksAgo, now } = getWeekDates();

  // Top clicked this week
  const topClicked = await collection
    .aggregate([
      { $match: { status: 'published', lastClickedAt: { $gte: weekAgo } } },
      { $sort: { clicks: -1 } },
      { $limit: config.topResourcesLimit },
      { $project: { title: 1, clicks: 1, category: 1, lastClickedAt: 1 } },
    ])
    .toArray();

  // Category averages for comparison
  const categoryAvg = await collection
    .aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', avgClicks: { $avg: '$clicks' } } },
    ])
    .toArray();

  const categoryAvgMap = new Map(categoryAvg.map((c: any) => [c._id, c.avgClicks || 1]));

  // Calculate comparison multipliers
  const topResources: TopResource[] = topClicked.map((r: any) => {
    const avgForCategory = categoryAvgMap.get(r.category) || 1;
    const multiplier = Math.round(r.clicks / avgForCategory);
    return {
      id: r._id.toString(),
      title: r.title,
      clicks: r.clicks,
      category: r.category || 'Uncategorized',
      comparisonMultiplier: multiplier,
      comparison: multiplier > 1 ? `${multiplier}x more than category average` : 'At category average',
    };
  });

  // Total clicks this week
  const totalThisWeek = await collection
    .aggregate([
      { $match: { status: 'published', lastClickedAt: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$clicks' } } },
    ])
    .toArray();

  // Total clicks previous week
  const totalPrevWeek = await collection
    .aggregate([
      {
        $match: {
          status: 'published',
          lastClickedAt: { $gte: twoWeeksAgo, $lt: weekAgo },
        },
      },
      { $group: { _id: null, total: { $sum: '$clicks' } } },
    ])
    .toArray();

  const totalClicksThisWeek = totalThisWeek[0]?.total || 0;
  const totalClicksPreviousWeek = totalPrevWeek[0]?.total || 0;
  const weekOverWeekChange =
    totalClicksPreviousWeek > 0
      ? Math.round(((totalClicksThisWeek - totalClicksPreviousWeek) / totalClicksPreviousWeek) * 100)
      : 0;

  // Trending topics (velocity by category)
  const trendingData = await collection
    .aggregate([
      { $match: { status: 'published', lastClickedAt: { $gte: twoWeeksAgo } } },
      {
        $addFields: {
          isThisWeek: { $gte: ['$lastClickedAt', weekAgo] },
        },
      },
      {
        $group: {
          _id: '$category',
          currentWeekClicks: {
            $sum: { $cond: ['$isThisWeek', '$clicks', 0] },
          },
          previousWeekClicks: {
            $sum: { $cond: ['$isThisWeek', 0, '$clicks'] },
          },
        },
      },
      { $match: { _id: { $ne: null } } },
    ])
    .toArray();

  const trendingTopics: TrendingTopic[] = trendingData
    .map((t: any) => {
      const velocity =
        t.previousWeekClicks > 0
          ? ((t.currentWeekClicks - t.previousWeekClicks) / t.previousWeekClicks) * 100
          : t.currentWeekClicks > 0
            ? 100
            : 0;

      return {
        category: t._id,
        currentWeekClicks: t.currentWeekClicks,
        previousWeekClicks: t.previousWeekClicks,
        velocityPercent: Math.round(velocity),
        direction: velocity > 5 ? 'up' : velocity < -5 ? 'down' : 'stable',
      } as TrendingTopic;
    })
    .filter((t) => t.direction !== 'stable')
    .sort((a, b) => Math.abs(b.velocityPercent) - Math.abs(a.velocityPercent));

  return {
    topResources,
    trendingTopics,
    totalClicksThisWeek,
    totalClicksPreviousWeek,
    weekOverWeekChange,
  };
}

/**
 * Identify content gaps: under-accessed categories, stale content
 */
async function identifyContentGaps(
  config: InsightsServiceConfig = DEFAULT_INSIGHTS_CONFIG
): Promise<ContentGap[]> {
  const db = await getDb();
  const collection = db.collection(RESOURCES_COLLECTION);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - config.staleThresholdDays);

  // Categories with no activity in threshold days
  const staleCategories = await collection
    .aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', lastEngagement: { $max: '$lastClickedAt' } } },
      { $match: { lastEngagement: { $lt: thirtyDaysAgo } } },
    ])
    .toArray();

  // Get resource counts per category
  const categoryCounts = await collection
    .aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ])
    .toArray();

  const countMap = new Map(categoryCounts.map((c: any) => [c._id, c.count]));

  const gaps: ContentGap[] = staleCategories
    .filter((c: any) => c._id)
    .map((c: any) => {
      const daysSince = Math.floor(
        (Date.now() - new Date(c.lastEngagement).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        category: c._id,
        issue: `No engagement in ${daysSince} days`,
        recommendation: 'Feature in next newsletter or update content',
        daysSinceActivity: daysSince,
        resourceCount: countMap.get(c._id) || 0,
      };
    });

  return gaps;
}

/**
 * Analyze AI usage: most cited, hidden gems, citation patterns
 */
async function analyzeAIUsage(
  config: InsightsServiceConfig = DEFAULT_INSIGHTS_CONFIG
): Promise<AIUsageMetrics> {
  const db = await getDb();
  const collection = db.collection(RESOURCES_COLLECTION);

  // Calculate average clicks for hidden gems threshold
  const avgClicksResult = await collection
    .aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, avgClicks: { $avg: '$clicks' } } },
    ])
    .toArray();

  const avgClicks = avgClicksResult[0]?.avgClicks || 10;

  // Hidden gems: high AI citation, low clicks
  const hiddenGemsRaw = await collection
    .aggregate([
      {
        $match: {
          status: 'published',
          aiCitations: { $gt: config.minAICitationsForGem },
          clicks: { $lt: avgClicks },
        },
      },
      {
        $addFields: {
          citationToClickRatio: {
            $divide: ['$aiCitations', { $max: ['$clicks', 1] }],
          },
        },
      },
      { $sort: { citationToClickRatio: -1 } },
      { $limit: config.hiddenGemsLimit },
      { $project: { title: 1, aiCitations: 1, clicks: 1, citationToClickRatio: 1, category: 1 } },
    ])
    .toArray();

  const hiddenGems: HiddenGem[] = hiddenGemsRaw.map((g: any) => ({
    id: g._id.toString(),
    title: g.title,
    aiCitations: g.aiCitations,
    clicks: g.clicks,
    citationToClickRatio: g.citationToClickRatio,
  }));

  // Most cited resources
  const mostCitedRaw = await collection
    .aggregate([
      { $match: { status: 'published', aiCitations: { $gt: 0 } } },
      { $sort: { aiCitations: -1 } },
      { $limit: 10 },
      { $project: { title: 1, aiCitations: 1, category: 1 } },
    ])
    .toArray();

  const mostCited: MostCitedResource[] = mostCitedRaw.map((r: any) => ({
    id: r._id.toString(),
    title: r.title,
    aiCitations: r.aiCitations,
    category: r.category || 'Uncategorized',
  }));

  // Citations by theme
  const citationsByThemeRaw = await collection
    .aggregate([
      { $match: { status: 'published' } },
      { $unwind: { path: '$themes', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$themes', citations: { $sum: '$aiCitations' } } },
      { $sort: { citations: -1 } },
    ])
    .toArray();

  const citationsByTheme = citationsByThemeRaw.map((t: any) => ({
    theme: t._id,
    citations: t.citations,
  }));

  // Total AI citations
  const totalResult = await collection
    .aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, total: { $sum: '$aiCitations' } } },
    ])
    .toArray();

  const totalAICitations = totalResult[0]?.total || 0;

  return {
    mostCited,
    hiddenGems,
    totalAICitations,
    citationsByTheme,
  };
}

/**
 * Generate action items based on insights
 */
function generateActionItems(
  engagement: EngagementMetrics,
  gaps: ContentGap[],
  aiUsage: AIUsageMetrics
): string[] {
  const items: string[] = [];

  // Promote hidden gems
  aiUsage.hiddenGems.slice(0, 2).forEach((gem) => {
    items.push(`Promote "${gem.title}" to users - AI cites it ${gem.aiCitations} times but only ${gem.clicks} clicks`);
  });

  // Address content gaps
  gaps.slice(0, 2).forEach((gap) => {
    items.push(`Review ${gap.category} content - ${gap.issue}`);
  });

  // Capitalize on trending topics
  engagement.trendingTopics
    .filter((t) => t.direction === 'up')
    .slice(0, 2)
    .forEach((topic) => {
      items.push(`Consider creating more ${topic.category} content - up ${topic.velocityPercent}% this week`);
    });

  return items;
}

/**
 * Generate Claude narrative summary
 */
async function generateNarrativeSummary(
  engagement: EngagementMetrics,
  gaps: ContentGap[],
  aiUsage: AIUsageMetrics
): Promise<string> {
  const prompt = `Generate a 2-3 sentence executive summary for a weekly knowledge hub insights report. Be concise and insightful.

Data:
- Total clicks this week: ${engagement.totalClicksThisWeek}
- Week-over-week change: ${engagement.weekOverWeekChange}%
- Top performer: ${engagement.topResources[0]?.title || 'N/A'} with ${engagement.topResources[0]?.clicks || 0} clicks (${engagement.topResources[0]?.comparison || 'N/A'})
- Trending up: ${engagement.trendingTopics.filter((t) => t.direction === 'up').map((t) => `${t.category} (+${t.velocityPercent}%)`).join(', ') || 'None'}
- Content gaps: ${gaps.map((g) => `${g.category} (${g.issue})`).join(', ') || 'None'}
- Hidden gems (AI loves, users don't know): ${aiUsage.hiddenGems.map((g) => `${g.title} (${g.aiCitations} AI citations, ${g.clicks} clicks)`).join(', ') || 'None'}

Write a brief, professional summary highlighting the most important insights.`;

  try {
    const response = await chat(
      [{ role: 'user', content: prompt }],
      'haiku',
      'You are a concise business analyst summarizing weekly engagement data.'
    );
    return response.content;
  } catch (error) {
    console.error('Failed to generate Claude summary:', error);
    // Fallback to simple template
    const changeDirection = engagement.weekOverWeekChange >= 0 ? 'increase' : 'decrease';
    return `This week saw a ${Math.abs(engagement.weekOverWeekChange)}% ${changeDirection} in engagement with ${engagement.totalClicksThisWeek} total clicks.${
      engagement.topResources[0]
        ? ` "${engagement.topResources[0].title}" was the top performer.`
        : ''
    }`;
  }
}

/**
 * Generate complete weekly report
 */
async function generateWeeklyReport(): Promise<InsightsReport> {
  const [engagement, gaps, aiUsage] = await Promise.all([
    computeEngagementPatterns(),
    identifyContentGaps(),
    analyzeAIUsage(),
  ]);

  const [executiveSummary, staleContent] = await Promise.all([
    generateNarrativeSummary(engagement, gaps, aiUsage),
    getStaleContent(),
  ]);

  const actionItems = generateActionItems(engagement, gaps, aiUsage);

  return {
    weekRange: formatWeekRange(),
    generatedAt: new Date(),
    executiveSummary,
    engagement,
    contentGaps: gaps,
    staleContent,
    aiUsage,
    actionItems,
  };
}

/**
 * Get stale content items
 */
async function getStaleContent(
  config: InsightsServiceConfig = DEFAULT_INSIGHTS_CONFIG
): Promise<StaleContent[]> {
  const db = await getDb();
  const collection = db.collection(RESOURCES_COLLECTION);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - config.staleThresholdDays);

  const staleItems = await collection
    .aggregate([
      {
        $match: {
          status: 'published',
          $or: [{ lastClickedAt: { $lt: thirtyDaysAgo } }, { lastClickedAt: { $exists: false } }],
        },
      },
      { $sort: { lastClickedAt: 1 } },
      { $limit: 10 },
      { $project: { title: 1, category: 1, lastClickedAt: 1 } },
    ])
    .toArray();

  return staleItems.map((item: any) => {
    const daysSince = item.lastClickedAt
      ? Math.floor((Date.now() - new Date(item.lastClickedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      id: item._id.toString(),
      title: item.title,
      category: item.category || 'Uncategorized',
      lastClickedAt: item.lastClickedAt || null,
      daysSinceLastClick: daysSince,
    };
  });
}

/**
 * Get admin recipients for email
 */
async function getAdminRecipients(): Promise<EmailRecipient[]> {
  const db = await getDb();
  const collection = db.collection(USERS_COLLECTION);

  const admins = await collection
    .find({ role: 'admin' }, { projection: { email: 1, name: 1 } })
    .toArray();

  return admins.map((a: any) => ({
    email: a.email,
    name: a.name,
  }));
}

export const insightsService = {
  computeEngagementPatterns,
  identifyContentGaps,
  analyzeAIUsage,
  generateWeeklyReport,
  getAdminRecipients,
  getStaleContent,
};
