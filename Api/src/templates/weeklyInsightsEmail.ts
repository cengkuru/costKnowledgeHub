/**
 * Weekly Insights Email Template
 * Responsive HTML email with CoST brand colors
 * Colors: teal #2A6478, coral #D94F4F, amber #E8A838
 */

import { InsightsReport, TopResource, TrendingTopic, ContentGap, HiddenGem } from '../types/insightsTypes';

const COLORS = {
  teal: '#2A6478',
  coral: '#D94F4F',
  amber: '#E8A838',
  lightGray: '#F5F5F5',
  darkGray: '#333333',
  mediumGray: '#666666',
  white: '#FFFFFF',
  green: '#28A745',
};

function formatTopResources(resources: TopResource[]): string {
  if (!resources.length) {
    return '<p style="color: #666;">No standout resources this week.</p>';
  }

  return resources
    .slice(0, 5)
    .map(
      (r, i) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <div style="font-weight: bold; color: ${COLORS.darkGray};">${i + 1}. ${r.title}</div>
          <div style="font-size: 14px; color: ${COLORS.mediumGray}; margin-top: 4px;">
            ${r.clicks} clicks
            <span style="color: ${COLORS.teal}; font-weight: bold;">
              (${r.comparison})
            </span>
          </div>
        </td>
      </tr>
    `
    )
    .join('');
}

function formatTrendingTopics(topics: TrendingTopic[]): string {
  const upTrending = topics.filter((t) => t.direction === 'up').slice(0, 5);
  const downTrending = topics.filter((t) => t.direction === 'down').slice(0, 3);

  if (!upTrending.length && !downTrending.length) {
    return '<p style="color: #666;">No significant trends this week.</p>';
  }

  let html = '';

  if (upTrending.length) {
    html += `
      <div style="margin-bottom: 16px;">
        <div style="font-weight: bold; color: ${COLORS.green}; margin-bottom: 8px;">Trending Up</div>
        ${upTrending
          .map(
            (t) => `
          <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: ${COLORS.darkGray};">${t.category}</span>
            <span style="color: ${COLORS.green}; font-weight: bold; float: right;">+${Math.round(t.velocityPercent)}%</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  if (downTrending.length) {
    html += `
      <div>
        <div style="font-weight: bold; color: ${COLORS.coral}; margin-bottom: 8px;">Declining</div>
        ${downTrending
          .map(
            (t) => `
          <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: ${COLORS.darkGray};">${t.category}</span>
            <span style="color: ${COLORS.coral}; font-weight: bold; float: right;">${Math.round(t.velocityPercent)}%</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  return html;
}

function formatContentGaps(gaps: ContentGap[]): string {
  if (!gaps.length) {
    return '<p style="color: #666;">No content gaps identified this week.</p>';
  }

  return gaps
    .slice(0, 5)
    .map(
      (g) => `
      <div style="padding: 12px; background: ${COLORS.lightGray}; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${COLORS.amber};">
        <div style="font-weight: bold; color: ${COLORS.darkGray};">${g.category}</div>
        <div style="color: ${COLORS.coral}; font-size: 14px; margin: 4px 0;">${g.issue}</div>
        <div style="color: ${COLORS.teal}; font-size: 14px;">Recommendation: ${g.recommendation}</div>
      </div>
    `
    )
    .join('');
}

function formatHiddenGems(gems: HiddenGem[]): string {
  if (!gems.length) {
    return '<p style="color: #666;">No hidden gems discovered this week.</p>';
  }

  return gems
    .slice(0, 5)
    .map(
      (g) => `
      <div style="padding: 12px; background: ${COLORS.lightGray}; border-radius: 8px; margin-bottom: 12px;">
        <div style="font-weight: bold; color: ${COLORS.darkGray};">${g.title}</div>
        <div style="font-size: 14px; color: ${COLORS.mediumGray}; margin-top: 4px;">
          <span style="color: ${COLORS.teal};">${g.aiCitations} AI citations</span> but only
          <span style="color: ${COLORS.coral};">${g.clicks} clicks</span>
        </div>
        <div style="font-size: 12px; color: ${COLORS.mediumGray}; margin-top: 4px;">
          Citation-to-click ratio: ${g.citationToClickRatio.toFixed(1)}x
        </div>
      </div>
    `
    )
    .join('');
}

function formatActionItems(items: string[]): string {
  if (!items.length) {
    return '<p style="color: #666;">No specific action items this week.</p>';
  }

  return `
    <ul style="margin: 0; padding-left: 20px;">
      ${items.map((item) => `<li style="padding: 8px 0; color: ${COLORS.darkGray};">${item}</li>`).join('')}
    </ul>
  `;
}

export function generateWeeklyInsightsEmail(report: InsightsReport, adminUrl: string): string {
  const weekOverWeekSign = report.engagement.weekOverWeekChange >= 0 ? '+' : '';
  const weekOverWeekColor = report.engagement.weekOverWeekChange >= 0 ? COLORS.green : COLORS.coral;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Knowledge Hub Insights</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${COLORS.lightGray};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: ${COLORS.white};">
    <!-- Header -->
    <tr>
      <td style="background: ${COLORS.teal}; padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: ${COLORS.white}; font-size: 24px; font-weight: 600;">
          CoST Knowledge Hub
        </h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
          Weekly Usage Insights
        </p>
      </td>
    </tr>

    <!-- Week Range -->
    <tr>
      <td style="padding: 16px 24px; background: ${COLORS.lightGray}; text-align: center;">
        <span style="color: ${COLORS.mediumGray}; font-size: 14px;">
          ${report.weekRange}
        </span>
      </td>
    </tr>

    <!-- Executive Summary -->
    <tr>
      <td style="padding: 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.teal}; font-size: 18px; border-bottom: 2px solid ${COLORS.teal}; padding-bottom: 8px;">
          Executive Summary
        </h2>
        <p style="margin: 0; color: ${COLORS.darkGray}; line-height: 1.6; font-size: 15px;">
          ${report.executiveSummary}
        </p>
      </td>
    </tr>

    <!-- Quick Stats -->
    <tr>
      <td style="padding: 0 24px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width: 50%; padding: 16px; background: ${COLORS.lightGray}; border-radius: 8px 0 0 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: ${COLORS.teal};">
                ${report.engagement.totalClicksThisWeek}
              </div>
              <div style="font-size: 12px; color: ${COLORS.mediumGray}; margin-top: 4px;">
                Total Clicks This Week
              </div>
            </td>
            <td style="width: 50%; padding: 16px; background: ${COLORS.lightGray}; border-radius: 0 8px 8px 0; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: ${weekOverWeekColor};">
                ${weekOverWeekSign}${Math.round(report.engagement.weekOverWeekChange)}%
              </div>
              <div style="font-size: 12px; color: ${COLORS.mediumGray}; margin-top: 4px;">
                Week-over-Week Change
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Top Resources -->
    <tr>
      <td style="padding: 0 24px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.teal}; font-size: 18px; border-bottom: 2px solid ${COLORS.teal}; padding-bottom: 8px;">
          Top Performing Resources
        </h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${formatTopResources(report.engagement.topResources)}
        </table>
      </td>
    </tr>

    <!-- Trending Topics -->
    <tr>
      <td style="padding: 0 24px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.teal}; font-size: 18px; border-bottom: 2px solid ${COLORS.teal}; padding-bottom: 8px;">
          Topic Trends
        </h2>
        ${formatTrendingTopics(report.engagement.trendingTopics)}
      </td>
    </tr>

    <!-- Content Opportunities -->
    <tr>
      <td style="padding: 0 24px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.amber}; font-size: 18px; border-bottom: 2px solid ${COLORS.amber}; padding-bottom: 8px;">
          Content Opportunities
        </h2>
        ${formatContentGaps(report.contentGaps)}
      </td>
    </tr>

    <!-- Hidden Gems -->
    <tr>
      <td style="padding: 0 24px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.teal}; font-size: 18px; border-bottom: 2px solid ${COLORS.teal}; padding-bottom: 8px;">
          Hidden Gems (AI Loves, Users Don't Know)
        </h2>
        <p style="margin: 0 0 16px; color: ${COLORS.mediumGray}; font-size: 14px;">
          These resources are frequently cited by the AI assistant but have low user engagement. Consider promoting them.
        </p>
        ${formatHiddenGems(report.aiUsage.hiddenGems)}
      </td>
    </tr>

    <!-- Action Items -->
    <tr>
      <td style="padding: 0 24px 24px;">
        <h2 style="margin: 0 0 16px; color: ${COLORS.coral}; font-size: 18px; border-bottom: 2px solid ${COLORS.coral}; padding-bottom: 8px;">
          Recommended Actions
        </h2>
        ${formatActionItems(report.actionItems)}
      </td>
    </tr>

    <!-- CTA Button -->
    <tr>
      <td style="padding: 0 24px 32px; text-align: center;">
        <a href="${adminUrl}" style="display: inline-block; padding: 14px 32px; background: ${COLORS.teal}; color: ${COLORS.white}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Full Dashboard
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px; background: ${COLORS.lightGray}; text-align: center;">
        <p style="margin: 0; color: ${COLORS.mediumGray}; font-size: 12px;">
          This is an automated weekly report from the CoST Knowledge Hub.
        </p>
        <p style="margin: 8px 0 0; color: ${COLORS.mediumGray}; font-size: 12px;">
          Generated on ${report.generatedAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
