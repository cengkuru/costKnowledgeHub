/**
 * Types for Weekly Usage Insights Email System
 * Defines structures for engagement metrics, content gaps, and AI usage patterns
 */

// ============================================================================
// TOP RESOURCES & ENGAGEMENT
// ============================================================================

export interface TopResource {
  id: string;
  title: string;
  clicks: number;
  category: string;
  comparison: string; // "10x more than category average"
  comparisonMultiplier: number;
}

export interface TrendingTopic {
  category: string;
  currentWeekClicks: number;
  previousWeekClicks: number;
  velocityPercent: number; // (current - previous) / previous * 100
  direction: 'up' | 'down' | 'stable';
}

export interface EngagementMetrics {
  topResources: TopResource[];
  trendingTopics: TrendingTopic[];
  totalClicksThisWeek: number;
  totalClicksPreviousWeek: number;
  weekOverWeekChange: number; // percentage
}

// ============================================================================
// CONTENT GAPS
// ============================================================================

export interface ContentGap {
  category: string;
  issue: string;
  recommendation: string;
  daysSinceActivity?: number;
  resourceCount?: number;
}

export interface StaleContent {
  id: string;
  title: string;
  category: string;
  lastClickedAt: Date | null;
  daysSinceLastClick: number;
}

// ============================================================================
// AI USAGE PATTERNS
// ============================================================================

export interface HiddenGem {
  id: string;
  title: string;
  aiCitations: number;
  clicks: number;
  citationToClickRatio: number;
}

export interface MostCitedResource {
  id: string;
  title: string;
  aiCitations: number;
  category: string;
}

export interface AIUsageMetrics {
  mostCited: MostCitedResource[];
  hiddenGems: HiddenGem[];
  totalAICitations: number;
  citationsByTheme: { theme: string; citations: number }[];
}

// ============================================================================
// FULL REPORT
// ============================================================================

export interface InsightsReport {
  weekRange: string; // "Nov 25 - Dec 1, 2024"
  generatedAt: Date;
  executiveSummary: string; // Claude-generated narrative
  engagement: EngagementMetrics;
  contentGaps: ContentGap[];
  staleContent: StaleContent[];
  aiUsage: AIUsageMetrics;
  actionItems: string[];
}

// ============================================================================
// EMAIL RECIPIENTS
// ============================================================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface InsightsServiceConfig {
  staleThresholdDays: number; // default: 30
  topResourcesLimit: number; // default: 10
  hiddenGemsLimit: number; // default: 5
  minAICitationsForGem: number; // default: 5
}

export const DEFAULT_INSIGHTS_CONFIG: InsightsServiceConfig = {
  staleThresholdDays: 30,
  topResourcesLimit: 10,
  hiddenGemsLimit: 5,
  minAICitationsForGem: 5,
};
