/**
 * Follow-Up Question Generator - Guides users to their NEXT discovery
 *
 * Anticipates what users should explore next based on:
 * - Their current query
 * - What they found
 * - Common research/implementation workflows
 * - Knowledge gaps in their search
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { ResultItem } from '../types.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    temperature: 0.6,
    maxOutputTokens: 400
  }
});

export interface FollowUpQuestion {
  question: string;
  rationale: string;          // Why this question matters next
  category: 'deepen' | 'broaden' | 'implement' | 'compare' | 'verify';
  searchQuery?: string;       // Pre-populated query if they click it
}

/**
 * Generates intelligent follow-up questions based on search results
 */
export const generateFollowUps = async (
  originalQuery: string,
  results: ResultItem[]
): Promise<FollowUpQuestion[]> => {
  if (results.length === 0) {
    return [
      {
        question: 'Show me CoST implementation examples',
        rationale: 'No results found. Let\'s try a broader search.',
        category: 'broaden',
        searchQuery: 'CoST implementation examples'
      }
    ];
  }

  const resultSummary = results.slice(0, 5).map(r => ({
    title: r.title,
    type: r.type,
    year: r.year
  }));

  const prompt = `User searched for: "${originalQuery}"

They found these results:
${resultSummary.map(r => `• ${r.title} (${r.type}, ${r.year})`).join('\n')}

Generate 4-5 SMART follow-up questions that:
1. Help them go DEEPER into specific aspects
2. BROADEN their understanding of related topics
3. Guide toward IMPLEMENTATION/action
4. Enable COMPARISON across contexts/approaches
5. Help VERIFY or validate what they learned

Each question should:
- Feel like a natural next step
- Address potential gaps in current results
- Be specific and actionable
- Lead to valuable discoveries

Respond ONLY with valid JSON array:
[
  {
    "question": "How has CoST assurance evolved since 2018?",
    "rationale": "You found recent guidance - understanding the historical context will help you see what's changed and why",
    "category": "deepen",
    "searchQuery": "CoST assurance evolution 2018-2024"
  },
  {
    "question": "What are real-world examples of CoST implementation challenges?",
    "rationale": "Theory is great, but seeing actual challenges and solutions will make implementation easier",
    "category": "implement",
    "searchQuery": "CoST implementation challenges case studies"
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonText = jsonMatch[1] || text;

    return JSON.parse(jsonText) as FollowUpQuestion[];
  } catch (error) {
    console.error('Follow-up generation failed:', error);
    return [];
  }
};

/**
 * Identifies knowledge gaps in search results
 * What's MISSING that users should know about?
 */
export const identifyKnowledgeGaps = async (
  query: string,
  results: ResultItem[]
): Promise<string[]> => {
  const types = [...new Set(results.map(r => r.type))];
  const years = [...new Set(results.map(r => r.year).filter((y): y is number => y !== undefined))].sort();

  const prompt = `User searched for: "${query}"

Results breakdown:
- Content types: ${types.join(', ')}
- Year range: ${Math.min(...years)}-${Math.max(...years)}
- Total results: ${results.length}

What IMPORTANT topics or perspectives are MISSING from these results?

Consider:
- Missing content types (e.g., no case studies, no templates)
- Geographic gaps (no developing country examples)
- Temporal gaps (no recent updates or historical context)
- Methodological gaps (theory without practice, or vice versa)
- Stakeholder perspectives (missing government, civil society, or contractor views)

Respond ONLY with JSON array of 2-4 gaps:
[
  "No practical implementation templates found",
  "Missing case studies from Sub-Saharan Africa",
  "No recent updates since 2023 - latest developments not covered"
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonText = jsonMatch[1] || text;

    return JSON.parse(jsonText) as string[];
  } catch (error) {
    console.error('Gap identification failed:', error);
    return [];
  }
};

/**
 * Suggests alternative search strategies when results are poor
 */
export const suggestBetterSearches = async (
  query: string,
  resultCount: number
): Promise<string[]> => {
  if (resultCount >= 5) return []; // Results are fine

  const prompt = `User searched for: "${query}"
They only found ${resultCount} results.

Suggest 3-4 BETTER ways to search that would find more relevant content:

Consider:
- Using broader/narrower terms
- Expanding acronyms (OGP → Open Government Partnership)
- Using domain synonyms (transparency → disclosure, accountability)
- Breaking down complex queries into simpler parts
- Focusing on specific aspects

Respond ONLY with JSON array of alternative queries:
[
  "CoST disclosure requirements",
  "infrastructure transparency standards",
  "open contracting for public works"
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonText = jsonMatch[1] || text;

    return JSON.parse(jsonText) as string[];
  } catch (error) {
    console.error('Better search suggestion failed:', error);
    return [];
  }
};
