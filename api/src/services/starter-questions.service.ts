import { GoogleGenerativeAI } from '@google/generative-ai';
import { MongoClient } from 'mongodb';
import { config } from '../config.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: config.geminiModel });

interface StarterQuestion {
  icon: string;
  question: string;
  category: string;
}

let cachedQuestions: StarterQuestion[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// MongoDB client connection
let client: MongoClient | null = null;

const getClient = async (): Promise<MongoClient> => {
  if (client) return client;
  const mongoClient = new MongoClient(config.mongoUri);
  client = await mongoClient.connect();
  return client;
};

/**
 * Generates intelligent, context-aware starter questions using AI
 * Analyzes recent content, trending topics, and knowledge base coverage
 */
export async function generateStarterQuestions(): Promise<StarterQuestion[]> {
  // Return cached questions if still valid
  const now = Date.now();
  if (cachedQuestions && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedQuestions;
  }

  try {
    const mongoClient = await getClient();
    const db = mongoClient.db(config.dbName);

    // Get recent documents (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDocs = await db
      .collection('resources')
      .find({
        publishedDate: { $gte: thirtyDaysAgo }
      })
      .sort({ publishedDate: -1 })
      .limit(20)
      .project({ title: 1, type: 1, summary: 1, publishedDate: 1 })
      .toArray();

    // Get diverse document types and topics
    const allDocs = await db
      .collection('resources')
      .aggregate([
        { $sample: { size: 30 } },
        { $project: { title: 1, type: 1, summary: 1, country: 1 } }
      ])
      .toArray();

    // Analyze content with Gemini
    const prompt = `You are analyzing a knowledge hub about infrastructure transparency (CoST - Construction Sector Transparency Initiative).

Recent documents (last 30 days):
${recentDocs.map(d => `- ${d.title} (${d.type})`).join('\n')}

Sample content:
${allDocs.map(d => `- ${d.title} (${d.type})`).join('\n')}

Generate 6 SHORT starter questions that:
1. Are 3-8 words maximum
2. Start with action words or key topics
3. Reflect actual content in the knowledge base
4. Cover: standards, impact, transparency, assurance, countries, implementation

RULES:
- Maximum 8 words per question
- No verbose academic language
- Simple, direct labels
- Based on actual content shown above

Return ONLY a JSON array:
[
  {
    "icon": "🏗️",
    "question": "Short label here (3-8 words)",
    "category": "Category"
  }
]

Emojis:
🏗️ Standards, 📊 Impact/Data, 🔍 Transparency, ✅ Assurance, 🌍 Countries/Regions, 📈 Implementation

Examples of good questions:
- "OC4IDS standard"
- "Latest impact stories"
- "Assurance processes"
- "Infrastructure transparency guidelines"`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const questions = JSON.parse(jsonStr) as StarterQuestion[];

    // Validate structure
    if (!Array.isArray(questions) || questions.length < 4) {
      throw new Error('Invalid questions format');
    }

    // Cache the results
    cachedQuestions = questions;
    cacheTimestamp = now;

    console.log(`✨ Generated ${questions.length} intelligent starter questions`);
    return questions;

  } catch (error) {
    console.error('Error generating starter questions:', error);

    // Fallback to static questions if AI generation fails
    return [
      {
        icon: '🏗️',
        question: 'OC4IDS standard',
        category: 'Standards'
      },
      {
        icon: '📊',
        question: 'Latest impact stories',
        category: 'Impact'
      },
      {
        icon: '🔍',
        question: 'Infrastructure transparency guidelines',
        category: 'Transparency'
      },
      {
        icon: '✅',
        question: 'Assurance processes',
        category: 'Assurance'
      },
      {
        icon: '🌍',
        question: 'Country implementation examples',
        category: 'Countries'
      },
      {
        icon: '📈',
        question: 'Project disclosure standards',
        category: 'Implementation'
      }
    ];
  }
}

/**
 * Force refresh of starter questions (useful for testing or manual refresh)
 */
export function invalidateStarterQuestionsCache(): void {
  cachedQuestions = null;
  cacheTimestamp = 0;
}
