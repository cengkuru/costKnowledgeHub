import { GoogleGenAI, Type } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import config from '../config';
import { ApiError } from '../middleware/errorHandler';

// Initialize Anthropic client for Haiku prompt building
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    if (!config.anthropicApiKey) {
      throw new ApiError(500, 'ANTHROPIC_API_KEY not configured');
    }
    anthropicClient = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return anthropicClient;
}

// System prompt for Haiku to build consistent image prompts
const IMAGE_PROMPT_BUILDER_SYSTEM = `You are an expert editorial illustrator for CoST - Infrastructure Transparency Initiative.

Your job: Given a topic name and description, create an image generation prompt that:
1. Uses ONE clear metaphor that communicates the topic's meaning
2. Follows Harvard Business Review editorial illustration style
3. Passes the "headline test" - image works before reading any text

Style requirements:
- Editorial illustration, flat or isometric style
- Limited color palette (teal, amber, terracotta, cream, grays)
- Include human elements where appropriate (hands, silhouettes)
- Generous negative space
- NO: glow effects, 3D renders, text, logos, detailed faces
- Aspect ratio: 4:3 landscape

Reference metaphors for CoST topics:
- Data Standards/OC4IDS → Universal adapter hub connecting diverse data sources
- Review/Assurance → Peeling back polished surface to reveal underlying truth
- Measurement/Index → Ruler or gauge revealing hidden infrastructure
- Guidance → Compass and waypoints on a clear journey
- Capacity Building → Seeds growing into structural foundations
- Country Programs → Network nodes with local roots and global connections
- Tools → Precision instruments laid out on architect's desk
- Transparency → Glass structure revealing internal components

Example output format:
"Editorial illustration, isometric perspective with flat shading. [Scene description with ONE clear metaphor]. [Composition details]. Colors: [limited palette]. [Style notes if helpful]."

Output ONLY the image prompt, nothing else. No explanations, no preamble.`;

// Initialize Gemini
let ai: GoogleGenAI | null = null;

// Model to use for topic image generation
const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';

export function initializeAI(): void {
  if (!config.geminiApiKey) {
    console.warn('Warning: GEMINI_API_KEY not found. AI features will not work.');
    return;
  }
  ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
}

export function getAI(): GoogleGenAI {
  if (!ai) {
    initializeAI();
  }
  if (!ai) {
    throw new ApiError(500, 'AI service not initialized');
  }
  return ai;
}

interface SearchGroup {
  title: string;
  description: string;
  resourceIds: string[];
}

interface TranslatedItem {
  id: string;
  title: string;
  description: string;
}

interface ResourceContext {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
}

export const aiService = {
  /**
   * Perform semantic search on resources using AI
   */
  async semanticSearch(
    query: string,
    resources: ResourceContext[]
  ): Promise<SearchGroup[]> {
    const aiClient = getAI();

    const prompt = `
You are an expert Knowledge Manager for an Infrastructure Transparency initiative.
User Query: "${query}"

Task:
1. Select relevant resources from the provided list.
2. Organize them into 2-4 logical groups that represent a "User Journey" or "Workflow".
3. If the query is vague, group by standard categories.
4. Provide a 'title' for the group and a short 'description'.

Resources:
${JSON.stringify(resources)}

Return ONLY a JSON array of Group objects.
    `;

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                resourceIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['title', 'description', 'resourceIds'],
            },
          },
        },
      });

      const resultGroups = JSON.parse(response.text || '[]');
      return resultGroups;
    } catch (error) {
      console.error('Semantic Search Error:', error);
      throw new ApiError(500, 'AI search failed');
    }
  },

  /**
   * Translate resources to target language
   */
  async translateResources(
    items: TranslatedItem[],
    targetLang: 'es' | 'pt'
  ): Promise<TranslatedItem[]> {
    const aiClient = getAI();
    const languageName = targetLang === 'es' ? 'Spanish' : 'Portuguese';

    const prompt = `
Translate the 'title' and 'description' fields of the following JSON objects into ${languageName}.
Keep the 'id' field exactly as is.
Return the result as a JSON array of objects.

Data to translate:
${JSON.stringify(items)}
    `;

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
              },
            },
          },
        },
      });

      const translations = JSON.parse(response.text || '[]') as TranslatedItem[];
      return translations;
    } catch (error) {
      console.error('Translation Error:', error);
      throw new ApiError(500, 'Translation failed');
    }
  },

  /**
   * Generate content using AI
   */
  async generateContent(prompt: string): Promise<string> {
    const aiClient = getAI();

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });

      return response.text || '';
    } catch (error) {
      console.error('Content Generation Error:', error);
      throw new ApiError(500, 'Content generation failed');
    }
  },

  /**
   * Generate an image using Gemini 3 Pro Image Preview
   * Uses generateContent with IMAGE response modality
   * Returns the raw image buffer for external storage
   */
  async generateImage(prompt: string): Promise<Buffer> {
    console.log('=== AI Image Generation Started (Gemini 3 Pro Image) ===');
    console.log('Prompt:', prompt.substring(0, 100) + '...');
    console.log('API Key configured:', config.geminiApiKey ? 'YES' : 'NO');
    console.log('Using Gemini model:', GEMINI_IMAGE_MODEL);

    const aiClient = getAI();

    try {
      console.log('Calling Gemini Image Generation API...');
      const startTime = Date.now();

      // Using Gemini 3 Pro Image Preview with image generation capability
      const response = await aiClient.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents: prompt,
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
        }
      });

      const duration = Date.now() - startTime;
      console.log('Gemini Response received:', { duration: `${duration}ms` });

      // Extract image from response parts
      if (response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content?.parts || [];
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const buffer = Buffer.from(part.inlineData.data, 'base64');
            console.log('Image Generation Success:', { bufferSize: buffer.length });
            return buffer;
          }
        }
      }

      console.error('No image data in response');
      throw new Error('No image generated');
    } catch (error: any) {
      console.error('=== Image Generation Error ===');
      console.error('Error Type:', error.constructor.name);
      console.error('Error Message:', error.message);
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', error.response.data);
      }
      throw new ApiError(500, `Image generation failed: ${error.message}`);
    }
  },

  /**
   * Generate an image and return as base64 data URL (for backward compatibility)
   */
  async generateImageAsDataUrl(prompt: string): Promise<string> {
    const buffer = await this.generateImage(prompt);
    const base64 = buffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  },

  /**
   * Use Claude Haiku to build a consistent, HBR-style image prompt
   * from topic name and description
   */
  async buildPromptWithHaiku(topicName: string, topicDescription: string): Promise<string> {
    console.log('=== Building Image Prompt with Claude Haiku ===');
    console.log('Topic:', topicName);
    console.log('Description:', topicDescription?.substring(0, 100) || 'None');

    try {
      const client = getAnthropicClient();
      const startTime = Date.now();

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: IMAGE_PROMPT_BUILDER_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Topic: ${topicName}\nDescription: ${topicDescription || 'No description provided'}`,
          },
        ],
      });

      const duration = Date.now() - startTime;
      console.log('Haiku Response received:', { duration: `${duration}ms` });

      // Extract text from response
      const textBlock = response.content.find(block => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Haiku');
      }

      const prompt = textBlock.text.trim();
      console.log('Generated prompt:', prompt.substring(0, 150) + '...');

      return prompt;
    } catch (error: any) {
      console.error('=== Haiku Prompt Building Error ===');
      console.error('Error:', error.message);
      // Fall back to a simple default prompt
      console.log('Falling back to default prompt template');
      return `Editorial illustration, clean flat style. A building or infrastructure element rendered in two transparent layers: the outer form is glass-like, allowing clear view of the internal structure—support beams, connections, material composition. Measurement annotations float near key structural points. Topic: ${topicName}. Colors: warm amber and gold for structure, blueprint teal for internal elements, clean white highlights. Generous negative space. 4:3 landscape aspect ratio.`;
    }
  },
};
