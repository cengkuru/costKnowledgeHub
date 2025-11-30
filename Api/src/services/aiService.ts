import { GoogleGenAI, Type } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
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

// System prompt for Haiku to build consistent image prompts for topics
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

// System prompt for Haiku to build HBR-quality conceptual image prompts for resource covers
// Follows the "one clear idea" principle - image must communicate the concept before reading the headline
const RESOURCE_COVER_PROMPT_BUILDER_SYSTEM = `You are an expert editorial illustrator creating Harvard Business Review quality conceptual illustrations for CoST - Infrastructure Transparency Initiative.

## THE HBR TEST
Your image must pass this test: Someone should understand the core concept from the image BEFORE reading any text. No generic abstractions. One clear metaphor that communicates meaning.

## Your Task
Given resource metadata (title, description, type, themes, workstreams), create an image prompt that:
1. Encodes ONE clear conceptual idea through visual metaphor
2. Avoids generic "techy geometric shapes" that could illustrate anything
3. Creates a genuine conceptual connection to the resource's purpose

## CoST Brand Colors
- Deep teal: #2A6478
- Rich coral: #D94F4F
- Warm amber: #E8A838
- Cream white: #F8F6F1
- Documentary grays and blueprint blues for "revealed truth" elements

## Theme-Specific Metaphors (use when theme is specified)

**ASSURANCE / Independent Review:**
Metaphor: Peeling back a polished surface to reveal truth underneath
Visual: Cross-section showing pristine infrastructure surface being peeled back like paper to reveal actual underlying structure—exposed rebar, measurement annotations, inspection marks. A human hand holding the peeled edge.
Colors: Warm golds for "presented" surface; documentary grays and blueprint blues for "revealed" reality.

**CLIMATE / Environmental:**
Metaphor: Traceable flow—transparency as visible, measured pipeline
Visual: Transparent glass pipeline/aqueduct carrying stylized currency as flowing liquid, with measurement markings, leading to landscape with green infrastructure AND temperature gauge. Pipeline is GLASS—nothing hidden.
Colors: Teal glass, amber liquid, muted greens for landscape.

**DATA STANDARDS / OC4IDS:**
Metaphor: Universal adapter—standards as shared connection language
Visual: Central hexagonal hub with graph-paper texture. Diverse "plug" shapes (crane, contract, currency, calendar, map pin) connecting from multiple angles, all transforming into uniform connectors. Clean data streams flow out in parallel.
Colors: Hub in white/gray, inputs in varied warm tones, outputs in consistent teal.

**DISCLOSURE / Transparency:**
Metaphor: Glass structure revealing internal components
Visual: Building or bridge rendered in transparent layers, internal workings visible. Data flows as elegant curves connecting nodes. Light passing through creates depth.
Colors: Clean whites, subtle blues, teal accents.

**PROCUREMENT:**
Metaphor: Fair scales balanced on transparent foundation
Visual: Balance/scales made of transparent materials, documents and resources on each side, measurement grid beneath. Clear sight lines through entire structure.
Colors: Amber for scales, teal for documents, cream background.

**CAPACITY BUILDING:**
Metaphor: Seeds growing into structural foundations
Visual: Ascending terraced structure like a ziggurat. Base shows seeds/roots transforming into sophisticated geometric architectural forms at top. Each level builds visibly on previous.
Colors: Earth tones at base graduating to teal at top.

**SOCIAL ACCOUNTABILITY:**
Metaphor: Multiple hands holding up/examining infrastructure
Visual: Stylized human hands (silhouettes) lifting or examining a piece of infrastructure from different angles. The infrastructure is transparent, viewable from all perspectives.
Colors: Warm earth tones for hands, teal for infrastructure.

## Resource Type Modifiers

- **Assurance Report:** Add verification marks, measurement annotations, "before/after" split composition
- **Guidance:** Add compass elements, clear pathway markers, waypoints on journey
- **Case Study:** Add location pin, specific geography hints, real-world grounding
- **Tool:** Add precision instruments, architect's desk aesthetic, functional layout
- **Template:** Add modular blocks, repeatable patterns, structural framework
- **Research:** Add data patterns emerging from complexity, analytical lens
- **Training:** Add ascending steps, knowledge transfer arrows, growth trajectory
- **Policy:** Add institutional weight, balanced scales, governance symbols

## Style Requirements
- Editorial illustration, clean vector style with subtle texture
- Flat or isometric perspective with intentional composition
- Generous negative space (30% minimum for title overlay area)
- Strong diagonal or asymmetric composition for dynamism
- Human elements where appropriate (hands, silhouettes—no detailed faces)
- NO: glow effects, 3D renders, text, logos, generic geometric abstractions

## Output Format
Output ONLY the image prompt in this format:
"Editorial illustration, [perspective/style]. [Main scene description with ONE clear metaphor]. [Composition details and human elements if any]. [Key symbolic elements]. Color palette: [specific colors from brand]. [Style notes]. 4:3 landscape aspect ratio."

Output ONLY the prompt. No explanations, no preamble, no "Here is the prompt:" prefix.`;

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

  /**
   * Use Claude Haiku to build HBR-quality conceptual image prompts
   * for resource cover images using all available resource metadata
   */
  async buildResourceCoverPrompt(
    title: string,
    description: string,
    resourceType?: string,
    themes?: string[],
    workstreams?: string[]
  ): Promise<string> {
    console.log('=== Building HBR-Quality Resource Cover Prompt with Claude Haiku ===');
    console.log('Title:', title);
    console.log('Description:', description?.substring(0, 100) || 'None');
    console.log('Type:', resourceType || 'Unknown');
    console.log('Themes:', themes?.join(', ') || 'None');
    console.log('Workstreams:', workstreams?.join(', ') || 'None');

    try {
      const client = getAnthropicClient();
      const startTime = Date.now();

      // Build rich context for Haiku
      const contextParts = [
        `Resource Title: ${title}`,
        `Description: ${description || 'No description provided'}`,
        `Resource Type: ${resourceType || 'general'}`,
      ];

      if (themes && themes.length > 0) {
        contextParts.push(`Themes: ${themes.join(', ')}`);
      }

      if (workstreams && workstreams.length > 0) {
        contextParts.push(`Workstreams: ${workstreams.join(', ')}`);
      }

      // Add guidance based on primary theme/workstream
      const primaryTheme = themes?.[0];
      const primaryWorkstream = workstreams?.[0];

      if (primaryTheme || primaryWorkstream) {
        contextParts.push('');
        contextParts.push('IMPORTANT: Use the theme/workstream-specific metaphor from your instructions. The image must communicate this specific concept, not a generic abstract.');
      }

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: RESOURCE_COVER_PROMPT_BUILDER_SYSTEM,
        messages: [
          {
            role: 'user',
            content: contextParts.join('\n'),
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
      console.log('Generated HBR-quality prompt:', prompt.substring(0, 200) + '...');

      return prompt;
    } catch (error: any) {
      console.error('=== Haiku Resource Cover Prompt Building Error ===');
      console.error('Error:', error.message);
      // Fall back to a conceptual default based on primary theme/workstream
      console.log('Falling back to theme-aware default prompt');
      return this.getFallbackResourcePrompt(title, themes, workstreams);
    }
  },

  /**
   * Generate a theme-aware fallback prompt when Haiku fails
   */
  getFallbackResourcePrompt(title: string, themes?: string[], workstreams?: string[]): string {
    const primaryTheme = themes?.[0];
    const primaryWorkstream = workstreams?.[0];

    // Theme-specific fallbacks based on HBR principles
    if (primaryWorkstream === 'assurance' || primaryTheme === 'project_monitoring') {
      return `Editorial illustration, clean vector style with subtle texture. Cross-section view: a pristine bridge surface being peeled back like paper to reveal underlying structure—exposed rebar, measurement annotations, inspection marks. A stylized human hand holds the peeled edge. Color palette: warm golds for presented surface, documentary grays and blueprint blues for revealed reality. Strong diagonal composition with 30% negative space at bottom for title. 4:3 landscape aspect ratio.`;
    }

    if (primaryTheme === 'climate' || primaryTheme === 'environmental') {
      return `Editorial illustration, bold flat style with limited palette. Transparent glass pipeline carrying stylized currency as flowing liquid, with measurement markings along its length. Pipeline leads to landscape with green infrastructure elements and an embedded temperature gauge. The pipeline is GLASS—fully transparent, nothing hidden. Color palette: teal (#2A6478) glass, amber (#E8A838) liquid, muted greens for landscape, cream (#F8F6F1) background. 30% negative space for title. 4:3 landscape aspect ratio.`;
    }

    if (primaryTheme === 'data_standards') {
      return `Editorial illustration, isometric perspective with flat shading. Central hexagonal hub with graph-paper texture. Diverse "plug" shapes—crane silhouette, contract document, currency symbol, calendar, map pin—connecting from multiple angles, all transforming into uniform connectors where they meet the hub. Clean data streams flow outward in parallel lines. Color palette: hub in white/light gray, input shapes in amber (#E8A838) and terracotta, output streams in consistent teal (#2A6478). Generous negative space. 4:3 landscape aspect ratio.`;
    }

    if (primaryWorkstream === 'disclosure') {
      return `Editorial illustration, clean flat style. Building or bridge rendered in transparent layered panels, internal structural components clearly visible through glass-like surfaces. Data flows as elegant curves connecting luminous nodes within the structure. Light passes through creating depth and clarity. Color palette: clean whites, subtle blues, teal (#2A6478) accents. 30% negative space for title overlay. 4:3 landscape aspect ratio.`;
    }

    if (primaryWorkstream === 'capacity_building') {
      return `Editorial illustration, isometric perspective. Ascending terraced structure like a modern ziggurat. Base shows seeds and roots transforming into sophisticated geometric architectural forms at top. Each level visibly builds on the previous, showing growth and development. Color palette: earth tones at base graduating to teal (#2A6478) at top, amber (#E8A838) highlights. Clean cream (#F8F6F1) background with generous negative space. 4:3 landscape aspect ratio.`;
    }

    // Default: transparency/openness metaphor
    return `Editorial illustration, clean vector style. A transparent layered structure—part building, part data architecture—with internal components fully visible. Measurement annotations float near key structural points. The composition suggests openness and accountability. Resource context: ${title}. Color palette: deep teal (#2A6478), warm amber (#E8A838), cream white (#F8F6F1), documentary grays. 30% negative space for title. 4:3 landscape aspect ratio.`;
  },

  /**
   * Generate a concise 1-2 sentence description for a resource
   * Uses Claude Haiku to analyze the URL content and create a meaningful description
   */
  async generateDescription(url: string, title: string, existingContent?: string): Promise<string> {
    console.log('=== Generating Description with Claude Haiku ===');
    console.log('URL:', url);
    console.log('Title:', title);

    try {
      const client = getAnthropicClient();
      const startTime = Date.now();

      // Fetch content from URL if not provided
      let content = existingContent || '';
      if (!content && url) {
        try {
          console.log('Fetching content from URL...');
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'CoST Knowledge Hub Bot/1.0',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (response.ok) {
            const html = await response.text();
            // Strip HTML tags and extract text content
            content = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 3000); // Limit content to ~3000 chars
            console.log('Content fetched:', content.length, 'chars');
          } else {
            console.warn('Failed to fetch URL:', response.status);
          }
        } catch (fetchError: any) {
          console.warn('URL fetch error:', fetchError.message);
        }
      }

      // Build prompt for Haiku
      const promptParts = [
        `Resource Title: ${title}`,
        `Resource URL: ${url}`,
      ];

      if (content) {
        promptParts.push(`\nPage Content (excerpt):\n${content.substring(0, 2000)}`);
      }

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: `You are a technical writer for CoST - Infrastructure Transparency Initiative.

Your task: Generate a concise 1-2 sentence description for a knowledge resource.

Requirements:
- Maximum 150 characters
- Describe WHAT the resource is and WHO it's for
- Be specific about the content/purpose
- Use active voice
- No marketing fluff or generic phrases
- If URL content is available, use it to inform the description

Format: Return ONLY the description text, nothing else. No quotes, no labels.

Example outputs:
- "Step-by-step guide for implementing OC4IDS data standards in public procurement systems."
- "Case study examining how Uganda's infrastructure transparency program reduced cost overruns by 30%."
- "Excel template for tracking infrastructure project milestones and disclosure requirements."`,
        messages: [
          {
            role: 'user',
            content: promptParts.join('\n'),
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

      const description = textBlock.text.trim();
      console.log('Generated description:', description);

      // Ensure it's not too long
      if (description.length > 300) {
        return description.substring(0, 297) + '...';
      }

      return description;
    } catch (error: any) {
      console.error('=== Description Generation Error ===');
      console.error('Error:', error.message);
      // Return a simple fallback
      return `Resource about ${title.toLowerCase()}.`;
    }
  },

  /**
   * Suggest tags for a resource based on title and description
   * Uses Claude Haiku for fast, accurate tag generation
   */
  async suggestTags(title: string, description: string): Promise<string[]> {
    console.log('=== Suggesting Tags with Claude Haiku ===');
    console.log('Title:', title);
    console.log('Description:', description?.substring(0, 100) || 'None');

    if (!title && !description) {
      return [];
    }

    try {
      const client = getAnthropicClient();
      const startTime = Date.now();

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: `You are a tag suggestion system for CoST (Infrastructure Transparency Initiative) knowledge resources.

Your job: Given a resource title and description, suggest 3-6 relevant tags that help categorize and find the resource.

Tag guidelines:
- Use lowercase with hyphens for multi-word tags (e.g., "open-data", "case-study")
- Include content type if clear (e.g., "guidance", "report", "tool", "template")
- Include geographic region if mentioned (e.g., "africa", "latin-america", "uganda")
- Include CoST themes if relevant: transparency, disclosure, assurance, accountability, procurement, infrastructure, data-standards, oc4ids
- Be specific and descriptive, not generic
- Max 6 tags, min 3 tags

Output format: Return ONLY a JSON array of tag strings, nothing else.
Example: ["infrastructure-transparency", "guidance", "disclosure", "africa"]`,
        messages: [
          {
            role: 'user',
            content: `Title: ${title}\n\nDescription: ${description || 'No description provided'}`,
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

      // Parse JSON array from response
      const responseText = textBlock.text.trim();
      console.log('Raw response:', responseText);

      try {
        const tags = JSON.parse(responseText);
        if (Array.isArray(tags) && tags.every(t => typeof t === 'string')) {
          console.log('Suggested tags:', tags);
          return tags.slice(0, 6); // Ensure max 6 tags
        }
      } catch (parseError) {
        console.warn('Failed to parse tags JSON, extracting manually');
        // Try to extract tags from response if JSON parsing fails
        const match = responseText.match(/\[([^\]]+)\]/);
        if (match) {
          const tagStrings = match[1].split(',').map(s =>
            s.trim().replace(/['"]/g, '').toLowerCase()
          ).filter(s => s.length > 0);
          console.log('Extracted tags:', tagStrings);
          return tagStrings.slice(0, 6);
        }
      }

      console.log('Could not extract tags from response');
      return [];
    } catch (error: any) {
      console.error('=== Tag Suggestion Error ===');
      console.error('Error:', error.message);
      return [];
    }
  },
};
