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

export const generateMultiLanguageSummary = onRequest({
  cors: true,
  secrets: [geminiApiKey],
  memory: '512MiB',
  timeoutSeconds: 180,
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
    const { content, title, resourceType } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ 
        success: false, 
        error: 'Content is required and must be a string' 
      });
      return;
    }

    // Limit content length to prevent token overflow
    const truncatedContent = content.substring(0, 10000);

    // Initialize Gemini with API key
    const apiKey = geminiApiKey.value();
    const genAI = getGenAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Generate summaries with a single prompt for all languages
    const prompt = `
You are a professional content summarizer for the Infrastructure Transparency Initiative (CoST).

Create professional summaries of the following content in three languages: English, Spanish, and Portuguese.

${title ? `Title: ${title}` : ''}
${resourceType ? `Resource Type: ${resourceType}` : ''}

Content to summarize:
${truncatedContent}

Requirements:
1. Each summary should be 150-200 words
2. Use professional, clear language appropriate for government officials and infrastructure professionals
3. Extract and highlight key points and findings
4. Maintain factual accuracy
5. Ensure cultural appropriateness for each language

Return ONLY a valid JSON object in this exact format:
{
  "en": "English summary here",
  "es": "Spanish summary here",
  "pt": "Portuguese summary here"
}
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const summaries = JSON.parse(jsonMatch[0]);

    // Validate the response structure
    if (!summaries.en || !summaries.es || !summaries.pt) {
      throw new Error('Missing language summaries in response');
    }

    logger.info('Successfully generated multi-language summaries', {
      resourceType,
      contentLength: content.length,
      hasTitle: !!title
    });

    res.json({
      success: true,
      summaries
    });

  } catch (error) {
    logger.error('Error generating summaries:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate summaries. Please try again.'
    });
  }
});