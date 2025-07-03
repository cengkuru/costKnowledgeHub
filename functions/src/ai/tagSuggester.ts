import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from 'firebase-functions';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

// Lazy initialization for Gemini client
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(apiKey: string): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// CoST topic categories for context
const COST_TOPICS = [
  'disclosure', 'transparency', 'accountability', 'procurement',
  'monitoring', 'evaluation', 'stakeholder engagement', 'assurance',
  'infrastructure', 'construction', 'public works', 'governance',
  'anti-corruption', 'value for money', 'project management',
  'data standards', 'open data', 'citizen participation'
];

export const suggestTags = onRequest({
  cors: true,
  secrets: [geminiApiKey],
  memory: '256MiB',
  timeoutSeconds: 60,
  maxInstances: 10
}, async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { title, description, content, resourceType, existingTags } = req.body;

    if (!title || typeof title !== 'object') {
      res.status(400).json({ 
        success: false, 
        error: 'Title is required and must be a multi-language object' 
      });
      return;
    }

    // Combine all text for analysis
    const combinedText = [
      Object.values(title).join(' '),
      description ? Object.values(description).join(' ') : '',
      content ? content.substring(0, 3000) : '', // Limit content length
      resourceType || ''
    ].join(' ');

    // Initialize Gemini with API key
    const apiKey = geminiApiKey.value();
    const genAI = getGenAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Generate tag suggestions
    const prompt = `
You are an expert in infrastructure transparency and the CoST (Infrastructure Transparency Initiative) methodology.

Analyze the following resource content and suggest relevant tags.

Content to analyze:
${combinedText}

CoST topic context: ${COST_TOPICS.join(', ')}
${existingTags ? `Existing tags to avoid: ${existingTags.join(', ')}` : ''}

Requirements:
1. Suggest 5-10 highly relevant tags
2. Tags should be specific to infrastructure transparency and CoST methodology
3. Include both broad topics and specific themes
4. Tags should be 1-3 words, lowercase
5. Assign a confidence score (0.0-1.0) based on relevance
6. Provide a brief reason for each suggestion

Return ONLY a valid JSON array in this exact format:
[
  {
    "tag": "procurement",
    "confidence": 0.95,
    "reason": "Document focuses on procurement processes"
  },
  ...
]
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const response = await result.response;
    const text = response.text();
    
    // Extract JSON array from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    let suggestions = JSON.parse(jsonMatch[0]);

    // Validate and filter suggestions
    suggestions = suggestions
      .filter((s: any) => s.tag && typeof s.tag === 'string' && s.confidence !== undefined)
      .map((s: any) => ({
        tag: s.tag.toLowerCase().trim(),
        confidence: Math.min(Math.max(s.confidence, 0), 1), // Clamp between 0 and 1
        reason: s.reason || 'AI suggested based on content analysis'
      }))
      .filter((s: any) => !existingTags?.includes(s.tag)) // Remove duplicates
      .sort((a: any, b: any) => b.confidence - a.confidence) // Sort by confidence
      .slice(0, 10); // Limit to 10 suggestions

    logger.info('Successfully generated tag suggestions', {
      resourceType,
      suggestionsCount: suggestions.length,
      existingTagsCount: existingTags?.length || 0
    });

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    logger.error('Error suggesting tags:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to suggest tags. Please try again.'
    });
  }
});