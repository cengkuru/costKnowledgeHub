#!/usr/bin/env tsx
/**
 * Demo: Intelligent Search - Context is EVERYTHING
 *
 * Shows off the AI capabilities that make connections
 * humans would NEVER spot on their own.
 */

import axios from 'axios';
import 'dotenv/config';

const API_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

const demo = async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🧠 INTELLIGENT SEARCH DEMO                               ║
║  Context is EVERYTHING - Watch AI make connections       ║
╚═══════════════════════════════════════════════════════════╝
`);

  const queries = [
    'CoST assurance process',
    'latest infrastructure transparency news',
    'how to implement disclosure requirements'
  ];

  for (const query of queries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${colors.bright}${colors.cyan}Query: "${query}"${colors.reset}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // === PHASE 1: Intent Analysis ===
      console.log(`${colors.yellow}📊 PHASE 1: Understanding Intent...${colors.reset}`);
      const intentRes = await axios.get(`${API_URL}/intelligent-search/intent`, {
        params: { q: query }
      });

      const { intent } = intentRes.data;
      console.log(`  Category: ${colors.green}${intent.category}${colors.reset}`);
      console.log(`  Expanded Query: "${colors.green}${intent.expandedQuery}${colors.reset}"`);
      console.log(`  Confidence: ${colors.green}${(intent.confidence * 100).toFixed(0)}%${colors.reset}`);

      if (intent.implicitNeeds.length > 0) {
        console.log(`  ${colors.magenta}Implicit Needs (what you didn't ask but need):${colors.reset}`);
        intent.implicitNeeds.forEach((need: string) => {
          console.log(`    • ${need}`);
        });
      }

      if (intent.relatedTopics.length > 0) {
        console.log(`  ${colors.magenta}Related Topics:${colors.reset}`);
        intent.relatedTopics.forEach((topic: string) => {
          console.log(`    • ${topic}`);
        });
      }

      // === PHASE 2: Intelligent Search (Fast Mode) ===
      console.log(`\n${colors.yellow}🔍 PHASE 2: Multi-Strategy Search...${colors.reset}`);
      const searchRes = await axios.get(`${API_URL}/intelligent-search`, {
        params: {
          q: query,
          enhance: 'fast'  // fast | full | minimal
        },
        timeout: 30000
      });

      const response = searchRes.data;

      console.log(`  Found: ${colors.green}${response.items.length} primary results${colors.reset}`);

      // Show top 3 results
      console.log(`\n  ${colors.bright}Top Results:${colors.reset}`);
      response.items.slice(0, 3).forEach((item: any, i: number) => {
        console.log(`    ${i + 1}. ${colors.cyan}${item.title}${colors.reset}`);
        console.log(`       ${item.type} • ${item.year || 'N/A'}`);
        console.log(`       ${item.summary.slice(0, 100)}...`);
      });

      // === PHASE 3: AI Answer ===
      if (response.answer && response.answer.length > 0) {
        console.log(`\n  ${colors.bright}${colors.green}AI-Generated Answer:${colors.reset}`);
        response.answer.slice(0, 2).forEach((bullet: any) => {
          console.log(`    • ${bullet.text}`);
          console.log(`      ${colors.blue}[Sources: ${bullet.cites.length}]${colors.reset}`);
        });
      }

      // === PHASE 4: Hidden Connections ===
      if (response.connections && response.connections.length > 0) {
        console.log(`\n  ${colors.magenta}🔗 HIDDEN CONNECTIONS (AI discoveries):${colors.reset}`);
        response.connections.slice(0, 2).forEach((conn: any, i: number) => {
          console.log(`    ${i + 1}. [${conn.type}] ${conn.relationship}`);
          console.log(`       💡 Insight: ${conn.insight}`);
        });
      }

      // === PHASE 5: Follow-Up Questions ===
      if (response.followUpQuestions && response.followUpQuestions.length > 0) {
        console.log(`\n  ${colors.cyan}❓ FOLLOW-UP QUESTIONS (What to explore next):${colors.reset}`);
        response.followUpQuestions.slice(0, 3).forEach((q: any, i: number) => {
          console.log(`    ${i + 1}. ${q.question}`);
          console.log(`       Why: ${q.rationale}`);
        });
      }

      // === PHASE 6: Hidden Gems ===
      if (response.hiddenGems && response.hiddenGems.length > 0) {
        console.log(`\n  ${colors.yellow}💎 HIDDEN GEMS (Surprisingly relevant):${colors.reset}`);
        response.hiddenGems.forEach((gem: any, i: number) => {
          console.log(`    ${i + 1}. ${gem.title}`);
          console.log(`       ${gem.type} • ${gem.year || 'N/A'}`);
        });
      }

      // === PHASE 7: Knowledge Gaps ===
      if (response.knowledgeGaps && response.knowledgeGaps.length > 0) {
        console.log(`\n  ${colors.yellow}⚠️  KNOWLEDGE GAPS (What's missing):${colors.reset}`);
        response.knowledgeGaps.forEach((gap: string) => {
          console.log(`    • ${gap}`);
        });
      }

      // === PHASE 8: Insight Clusters ===
      if (response.insightClusters && response.insightClusters.length > 0) {
        console.log(`\n  ${colors.green}💡 INSIGHT CLUSTERS (Patterns across results):${colors.reset}`);
        response.insightClusters.forEach((cluster: any, i: number) => {
          console.log(`    ${i + 1}. Theme: ${colors.bright}${cluster.theme}${colors.reset}`);
          console.log(`       Key Insight: ${cluster.keyInsight}`);
          console.log(`       Action: ${cluster.actionable}`);
        });
      }

      console.log(`\n${colors.green}✅ Complete intelligence analysis finished!${colors.reset}`);

    } catch (error: any) {
      console.error(`${colors.reset}❌ Error:`, error.message);
      if (error.response?.data) {
        console.error('Details:', error.response.data);
      }
    }

    // Pause between queries
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${colors.bright}${colors.green}🎉 Demo Complete!${colors.reset}`);
  console.log(`${'='.repeat(60)}\n`);

  console.log(`${colors.cyan}Try it yourself:${colors.reset}`);
  console.log(`  Fast Mode:    curl "http://localhost:3000/intelligent-search?q=your+query&enhance=fast"`);
  console.log(`  Full Mode:    curl "http://localhost:3000/intelligent-search?q=your+query&enhance=full"`);
  console.log(`  Intent Only:  curl "http://localhost:3000/intelligent-search/intent?q=your+query"`);
  console.log(`  Query Expand: curl "http://localhost:3000/intelligent-search/expand?q=your+query"\n`);
};

demo().catch(console.error);
