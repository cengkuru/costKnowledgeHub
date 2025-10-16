/**
 * Intent Analyzer - Anticipates user needs BEFORE they search
 *
 * Capabilities:
 * - Predicts what users are trying to achieve
 * - Expands queries with domain knowledge
 * - Identifies implicit requirements
 * - Suggests better search strategies
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    temperature: 0.3,  // Lower for more focused predictions
    maxOutputTokens: 500
  }
});

export interface UserIntent {
  category: 'research' | 'guidance' | 'examples' | 'comparison' | 'latest-updates' | 'historical' | 'implementation';
  expandedQuery: string;           // Better version of user's query
  implicitNeeds: string[];         // What they didn't ask but probably need
  suggestedFilters: {
    type?: string;
    yearFrom?: number;
    yearTo?: number;
    includeHistorical?: boolean;
  };
  relatedTopics: string[];         // Adjacent topics they should know about
  confidence: number;              // 0-1, how confident are we?
}

/**
 * Analyzes query intent and expands it with domain knowledge
 */
export const analyzeIntent = async (query: string): Promise<UserIntent> => {
  const prompt = `You are an expert in infrastructure transparency, CoST standards, and open contracting.

Analyze this user query: "${query}"

Predict:
1. What is their REAL intent? (research/guidance/examples/comparison/latest-updates/historical/implementation)
2. What's a better, more comprehensive version of their query?
3. What do they IMPLICITLY need but didn't ask for?
4. Should we filter by content type (Manual/Guide/News/Blog Post)?
5. Are they looking for recent content (2024-2025) or historical (2016-2020)?
6. What related topics should we also show them?

Respond ONLY with valid JSON:
{
  "category": "research",
  "expandedQuery": "comprehensive transparency guidelines for infrastructure procurement",
  "implicitNeeds": [
    "implementation examples",
    "common pitfalls to avoid",
    "success metrics"
  ],
  "suggestedFilters": {
    "type": "Guide",
    "yearFrom": 2023,
    "includeHistorical": false
  },
  "relatedTopics": [
    "disclosure requirements",
    "assurance processes",
    "stakeholder engagement"
  ],
  "confidence": 0.85
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonText = jsonMatch[1] || text;

    const intent = JSON.parse(jsonText) as UserIntent;

    return intent;
  } catch (error) {
    console.error('Intent analysis failed:', error);
    // Fallback to basic intent
    return {
      category: 'research',
      expandedQuery: query,
      implicitNeeds: [],
      suggestedFilters: {},
      relatedTopics: [],
      confidence: 0.5
    };
  }
};

/**
 * Generates query variations for better recall
 * Expands acronyms, adds synonyms, includes related terms
 */
export const expandQuery = async (query: string, intent: UserIntent): Promise<string[]> => {
  const prompt = `Given this query about infrastructure transparency: "${query}"

And this intent: ${intent.category}

Generate 3-5 query variations that would find the SAME content but using:
- Expanded acronyms (OGP → Open Government Partnership)
- Domain synonyms (transparency → disclosure, accountability)
- Related terms (procurement → contracting, tendering)

Keep variations concise (5-10 words each).

Respond ONLY with JSON array:
["variation 1", "variation 2", "variation 3"]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonText = jsonMatch[1] || text;

    return JSON.parse(jsonText) as string[];
  } catch (error) {
    console.error('Query expansion failed:', error);
    return [query]; // Fallback to original
  }
};

/**
 * Predicts what the user will need NEXT
 * Based on their current search and common workflows
 */
export const predictNextNeeds = async (query: string, resultTypes: string[]): Promise<string[]> => {
  const prompt = `User just searched for: "${query}"
They found these content types: ${resultTypes.join(', ')}

Based on typical CoST/infrastructure transparency workflows, what will they likely need NEXT?

Predict 3-5 follow-up questions/needs in their journey.

Examples:
- If they searched for "CoST assurance" → they'll need "assurance report templates", "quality criteria", "case studies"
- If they searched for "disclosure requirements" → they'll need "disclosure templates", "data standards", "verification processes"

Respond ONLY with JSON array of follow-up questions:
["How do I implement this in my country?", "What are success metrics?", "Show me examples from similar contexts"]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonText = jsonMatch[1] || text;

    return JSON.parse(jsonText) as string[];
  } catch (error) {
    console.error('Next needs prediction failed:', error);
    return [];
  }
};
