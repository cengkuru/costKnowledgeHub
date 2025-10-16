import { GoogleGenerativeAI } from '@google/generative-ai';
import { MongoClient } from 'mongodb';
import { config } from '../config.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: config.geminiModel });

interface QuickTopic {
  icon: string;
  topic: string;  // Changed from 'question' to 'topic' - short label
  category: string;
}

let cachedTopics: QuickTopic[] | null = null;
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
 * Generates intelligent, context-aware quick topic shortcuts using AI
 * Returns short, actionable topic labels (not questions) for quick navigation
 * Each topic is 2-5 words maximum for clarity and simplicity
 */
export async function generateQuickTopics(): Promise<QuickTopic[]> {
  // Return cached topics if still valid
  const now = Date.now();
  if (cachedTopics && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedTopics;
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

    // Analyze content with Gemini - optimized prompt for SHORT TOPIC LABELS
    const prompt = `You are creating quick topic shortcuts for a knowledge hub about infrastructure transparency (CoST).

Recent documents (last 30 days):
${recentDocs.map(d => `- ${d.title} (${d.type})`).join('\n')}

Sample content:
${allDocs.map(d => `- ${d.title} (${d.type})`).join('\n')}

Generate 6 QUICK TOPIC SHORTCUTS that:
1. Are SHORT LABELS (2-5 words maximum)
2. ARE NOT QUESTIONS - they are topic labels/shortcuts
3. Start with the key concept or topic
4. Reflect actual content in the knowledge base
5. Cover these categories: Standards, Impact, Transparency, Assurance, Countries, Implementation

CRITICAL RULES:
- Maximum 5 words per topic (prefer 2-3 words)
- NO question marks or question phrasing
- Simple, direct topic labels only
- Based on actual content shown above
- Think "navigation shortcuts" not "conversation starters"

Return ONLY a JSON array:
[
  {
    "icon": "🏗️",
    "topic": "Short topic label here",
    "category": "Category"
  }
]

Emojis to use:
🏗️ Standards, 📊 Impact/Data, 🔍 Transparency, ✅ Assurance, 🌍 Countries/Regions, 📈 Implementation

Examples of GOOD topic shortcuts:
- "OC4IDS standard"
- "Impact stories"
- "Infrastructure transparency"
- "Assurance processes"
- "Country programmes"
- "Project disclosure"

Examples of BAD (too long or question-like):
- "What is the OC4IDS standard for infrastructure?"
- "How does transparency improve infrastructure projects?"
- "Latest updates on country implementation programmes"`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const topics = JSON.parse(jsonStr) as QuickTopic[];

    // Validate structure and ensure short topics
    if (!Array.isArray(topics) || topics.length < 4) {
      throw new Error('Invalid topics format');
    }

    // Additional validation: ensure topics are short
    const validatedTopics = topics.map(t => {
      const wordCount = t.topic.split(' ').length;
      if (wordCount > 5) {
        // Truncate to first 5 words if AI generated too long
        t.topic = t.topic.split(' ').slice(0, 5).join(' ');
      }
      return t;
    });

    // Cache the results
    cachedTopics = validatedTopics;
    cacheTimestamp = now;

    console.log(`✨ Generated ${validatedTopics.length} quick topic shortcuts`);
    return validatedTopics;

  } catch (error) {
    console.error('Error generating quick topics:', error);

    // Fallback to static topics if AI generation fails
    // These are SHORT TOPIC LABELS, not questions
    return [
      {
        icon: '🏗️',
        topic: 'OC4IDS standard',
        category: 'Standards'
      },
      {
        icon: '📊',
        topic: 'Impact stories',
        category: 'Impact'
      },
      {
        icon: '🔍',
        topic: 'Infrastructure transparency',
        category: 'Transparency'
      },
      {
        icon: '✅',
        topic: 'Assurance processes',
        category: 'Assurance'
      },
      {
        icon: '🌍',
        topic: 'Country programmes',
        category: 'Countries'
      },
      {
        icon: '📈',
        topic: 'Project disclosure',
        category: 'Implementation'
      }
    ];
  }
}

/**
 * Force refresh of quick topics cache (useful for testing or manual refresh)
 */
export function invalidateQuickTopicsCache(): void {
  cachedTopics = null;
  cacheTimestamp = 0;
  console.log('🔄 Quick topics cache invalidated');
}