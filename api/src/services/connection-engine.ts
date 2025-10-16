/**
 * Connection Engine - Discovers relationships humans would NEVER spot
 *
 * Uses AI to:
 * - Find hidden patterns across documents
 * - Connect seemingly unrelated content
 * - Identify emerging trends
 * - Surface surprising insights
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { ScoredDocChunk } from '../types.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    temperature: 0.7,  // Higher for creative connections
    maxOutputTokens: 1000
  }
});

export interface Connection {
  type: 'causal' | 'temporal' | 'thematic' | 'contradictory' | 'complementary';
  doc1Title: string;
  doc2Title: string;
  doc1Url: string;
  doc2Url: string;
  relationship: string;        // Human-readable explanation
  insight: string;             // Why this connection matters
  confidence: number;
}

export interface InsightCluster {
  theme: string;               // Overarching pattern
  documents: string[];         // Document titles involved
  keyInsight: string;          // The "aha!" moment
  actionable: string;          // What users should do with this
  novelty: number;             // 0-1, how surprising is this?
}

/**
 * Discovers hidden connections between documents
 * Finds relationships that aren't obvious from titles/keywords alone
 */
export const discoverConnections = async (
  docs: ScoredDocChunk[]
): Promise<Connection[]> => {
  if (docs.length < 2) return [];

  // Create document summaries for analysis
  const docSummaries = docs.slice(0, 10).map((doc, i) => ({
    id: i,
    title: doc.title,
    type: doc.type,
    year: doc.year,
    snippet: doc.text.slice(0, 300)
  }));

  const prompt = `You are an expert at finding hidden connections in infrastructure transparency research.

Analyze these ${docSummaries.length} documents:

${docSummaries.map(d => `[${d.id}] ${d.title} (${d.type}, ${d.year})
Snippet: ${d.snippet}...`).join('\n\n')}

Find 3-5 SURPRISING connections between these documents that:
1. Wouldn't be obvious from titles alone
2. Reveal patterns, contradictions, or evolution of ideas
3. Provide actionable insights

Focus on:
- Causal: How one document's findings led to another's recommendations
- Temporal: How approaches evolved over time
- Thematic: Unexpected shared themes across different contexts
- Contradictory: Where documents disagree or present different approaches
- Complementary: Documents that together tell a complete story

Respond ONLY with valid JSON array:
[
  {
    "type": "causal",
    "doc1Title": "title of first doc",
    "doc2Title": "title of second doc",
    "doc1Url": "",
    "doc2Url": "",
    "relationship": "Document 1's findings about X directly influenced Document 2's approach to Y",
    "insight": "This shows how CoST methodology evolved from reactive disclosure to proactive transparency",
    "confidence": 0.85
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonText = jsonMatch[1] || text;

    const connections = JSON.parse(jsonText) as Array<Omit<Connection, 'doc1Url' | 'doc2Url'>>;

    // Map URLs back from original docs
    return connections.map(conn => {
      const doc1 = docs.find(d => d.title === conn.doc1Title);
      const doc2 = docs.find(d => d.title === conn.doc2Title);

      return {
        ...conn,
        doc1Url: doc1?.url || '',
        doc2Url: doc2?.url || ''
      };
    });
  } catch (error) {
    console.error('Connection discovery failed:', error);
    return [];
  }
};

/**
 * Identifies emerging themes and patterns across ALL results
 * The "forest from the trees" view
 */
export const extractInsightClusters = async (
  docs: ScoredDocChunk[]
): Promise<InsightCluster[]> => {
  if (docs.length < 3) return [];

  const docSummaries = docs.slice(0, 15).map(d => ({
    title: d.title,
    type: d.type,
    year: d.year,
    snippet: d.text.slice(0, 200)
  }));

  const prompt = `Analyze these ${docSummaries.length} documents about infrastructure transparency:

${docSummaries.map(d => `• ${d.title} (${d.type}, ${d.year})
  ${d.snippet}...`).join('\n\n')}

Identify 2-4 EMERGENT THEMES or patterns that:
1. Connect multiple documents in unexpected ways
2. Reveal evolution of ideas, contradictions, or gaps
3. Provide strategic insights users wouldn't spot alone

Each theme should:
- Synthesize findings from 3+ documents
- Highlight something NOVEL or SURPRISING
- Offer actionable recommendations

Respond ONLY with valid JSON array:
[
  {
    "theme": "Shift from compliance to impact measurement",
    "documents": ["Doc Title 1", "Doc Title 2", "Doc Title 3"],
    "keyInsight": "From 2018-2024, CoST guidance evolved from focusing on disclosure requirements to measuring real-world impact on infrastructure quality",
    "actionable": "When implementing CoST, prioritize impact metrics over just publishing data",
    "novelty": 0.85
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonText = jsonMatch[1] || text;

    return JSON.parse(jsonText) as InsightCluster[];
  } catch (error) {
    console.error('Insight extraction failed:', error);
    return [];
  }
};

/**
 * Finds documents that are surprisingly relevant despite low similarity scores
 * Uses deeper semantic understanding to surface hidden gems
 */
export const findHiddenGems = async (
  query: string,
  allDocs: ScoredDocChunk[]
): Promise<ScoredDocChunk[]> => {
  // Take docs ranked 20-50 (missed by top results but might be relevant)
  const lowRankedDocs = allDocs.slice(20, 50);
  if (lowRankedDocs.length === 0) return [];

  const docSummaries = lowRankedDocs.map((d, i) => ({
    index: i,
    title: d.title,
    type: d.type,
    snippet: d.text.slice(0, 250)
  }));

  const prompt = `User query: "${query}"

These documents ranked LOW in similarity search but might be surprisingly relevant:

${docSummaries.map(d => `[${d.index}] ${d.title} (${d.type})
${d.snippet}...`).join('\n\n')}

Which 2-3 of these are HIDDEN GEMS that:
- Address the query from a unique angle
- Provide context or background the top results miss
- Offer practical examples or case studies

Respond ONLY with JSON array of indices:
[5, 12, 23]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\d,\s]+\]/) || [null];
    const jsonText = jsonMatch[0] || '[]';

    const indices = JSON.parse(jsonText) as number[];
    return indices.map(i => lowRankedDocs[i]).filter(Boolean);
  } catch (error) {
    console.error('Hidden gems discovery failed:', error);
    return [];
  }
};
