import { onRequest } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import Replicate from 'replicate';

/**
 * Generate cover images for resource types using Replicate API
 * Falls back to Lorem Picsum if Replicate fails
 */
interface GenerateCoverImageData {
  title: string;
  description: string;
}

export const generateCoverImage = onRequest({
  maxInstances: 10,
  cors: ['http://localhost:4200', 'https://knowledgehub-2ed2f.web.app', 'https://knowledgehub-2ed2f.firebaseapp.com'],
}, async (request, response) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    response.set('Access-Control-Allow-Origin', request.headers.origin || '*');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.set('Access-Control-Max-Age', '3600');
    response.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Extract and verify Firebase ID token
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await getAuth().verifyIdToken(idToken);

    if (!decodedToken) {
      response.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    // Extract data from request body
    const { data } = request.body;
    if (!data) {
      response.status(400).json({ error: 'Invalid request format' });
      return;
    }

    const { title, description } = data as GenerateCoverImageData;

    if (!title || !description) {
      response.status(400).json({ error: 'Title and description are required' });
      return;
    }

    // Try to get image from Replicate first
    let imageUrl: string;
    let prompt: string;

    try {
      const replicateResult = await generateImageWithReplicate(title, description);
      imageUrl = replicateResult.imageUrl;
      prompt = replicateResult.prompt;
    } catch (replicateError) {
      console.warn('Replicate failed, falling back to Lorem Picsum:', replicateError);
      // Fallback to Lorem Picsum
      const fallback = generateFallbackImage(title, description);
      imageUrl = fallback.imageUrl;
      prompt = fallback.prompt;
    }

    response.json({
      result: {
        success: true,
        imageUrl,
        prompt
      }
    });

  } catch (error) {
    console.error('Error generating cover image:', error);
    response.status(500).json({ error: 'Failed to generate cover image' });
  }
});

/**
 * Generate an image using Replicate API
 */
async function generateImageWithReplicate(title: string, description: string): Promise<{ imageUrl: string; prompt: string }> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    throw new Error('Replicate API token not configured');
  }

  // Initialize Replicate client
  const replicate = new Replicate({
    auth: REPLICATE_API_TOKEN,
  });

  // Generate a professional prompt for the image
  const imagePrompt = generateImagePrompt(title, description);
  
  console.log(`Generating image with Replicate using prompt: "${imagePrompt}"`);

  try {
    // Using SDXL model for high-quality professional images
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: imagePrompt,
          negative_prompt: "text, watermark, logo, blurry, low quality, distorted, amateur",
          width: 1024,
          height: 512,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 30,
          scheduler: "K_EULER",
        }
      }
    );

    // Output is an array of URLs
    const outputArray = output as string[];
    if (!outputArray || outputArray.length === 0) {
      throw new Error('No image generated from Replicate');
    }

    const imageUrl = outputArray[0];
    console.log(`Successfully generated image with Replicate`);

    return {
      imageUrl,
      prompt: imagePrompt
    };
  } catch (error) {
    console.error('Replicate generation error:', error);
    throw error;
  }
}

/**
 * Generate a professional prompt for image generation based on title and description
 */
function generateImagePrompt(title: string, description: string): string {
  const keywords = extractKeywords(title, description);
  
  // CoST-specific prompt templates for different resource types
  const promptTemplates: Record<string, string> = {
    'guidance': 'Professional business guide book cover, modern design, clean layout, abstract directional elements',
    'case study': 'Modern business case study presentation, professional analytics dashboard, data visualization',
    'report': 'Professional business report cover, clean modern design, data analytics theme',
    'dataset': 'Data visualization, modern analytics dashboard, charts and graphs, technology theme',
    'tool': 'Professional technology tools, modern equipment, digital innovation, clean interface',
    'policy': 'Government building, professional documents, modern governance, institutional architecture',
    'template': 'Blueprint design, framework visualization, structured layout, professional template',
    'infographic': 'Modern infographic design, data visualization, clean professional layout',
    'review': 'Professional audit report, evaluation documents, modern business assessment',
    'transparency': 'Glass architecture, modern transparency concept, open governance, clear communication',
    'infrastructure': 'Modern construction site, engineering project, urban development, infrastructure building',
    'procurement': 'Business handshake, contract signing, professional meeting, partnership',
    'monitoring': 'Control room, monitoring dashboard, surveillance screens, data tracking',
    'accountability': 'Professional governance, ethical business, transparency in leadership',
    'stakeholder': 'Diverse business team meeting, community engagement, professional collaboration'
  };

  // Find matching template based on keywords
  let basePrompt = 'Professional business concept, modern clean design';
  
  for (const [key, template] of Object.entries(promptTemplates)) {
    if (title.toLowerCase().includes(key) || description.toLowerCase().includes(key)) {
      basePrompt = template;
      break;
    }
  }

  // Add style modifiers for consistency
  const styleModifiers = [
    'high quality photography',
    'professional lighting',
    'clean composition',
    '4K resolution',
    'modern business aesthetic',
    'subtle color palette'
  ];

  return `${basePrompt}, ${styleModifiers.join(', ')}`;
}

/**
 * Extract relevant keywords from title and description for image search
 */
function extractKeywords(title: string, description: string): string[] {
  // Combine title and description
  const text = `${title} ${description}`.toLowerCase();

  // CoST-specific keyword mappings for better image results
  const keywordMappings: Record<string, string[]> = {
    'guidance': ['guide', 'direction', 'compass', 'path'],
    'case study': ['business', 'analysis', 'research', 'study'],
    'report': ['document', 'analysis', 'data', 'research'],
    'dataset': ['data', 'statistics', 'charts', 'analytics'],
    'tool': ['tools', 'equipment', 'instruments', 'technology'],
    'policy': ['government', 'law', 'regulation', 'governance'],
    'template': ['blueprint', 'framework', 'structure', 'design'],
    'infographic': ['visualization', 'graphics', 'charts', 'design'],
    'independent review': ['audit', 'inspection', 'evaluation', 'assessment'],
    'transparency': ['openness', 'clarity', 'accountability', 'trust'],
    'infrastructure': ['construction', 'building', 'development', 'engineering'],
    'procurement': ['contract', 'business', 'agreement', 'partnership'],
    'monitoring': ['observation', 'tracking', 'surveillance', 'oversight'],
    'accountability': ['responsibility', 'governance', 'ethics', 'trust'],
    'stakeholder': ['community', 'people', 'partnership', 'collaboration']
  };

  // Find matching keywords and their mappings
  const keywords: string[] = [];

  for (const [key, mappings] of Object.entries(keywordMappings)) {
    if (text.includes(key)) {
      // Add the original term and pick 1-2 mappings for variety
      keywords.push(key);
      keywords.push(...mappings.slice(0, 2));
      break; // Use first match to avoid too many keywords
    }
  }

  // If no specific mappings found, extract general keywords
  if (keywords.length === 0) {
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'would', 'could', 'should'].includes(word));

    keywords.push(...words.slice(0, 3));
  }

  // Add some general professional/business terms for better results
  keywords.push('professional', 'business');

  // Remove duplicates and limit to 5 keywords max
  return [...new Set(keywords)].slice(0, 5);
}

/**
 * Fallback to Lorem Picsum with deterministic seed
 */
function generateFallbackImage(title: string, description: string): { imageUrl: string; prompt: string } {
  const keywords = [title, description].join(' ').toLowerCase();
  const seed = keywords.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const width = 800;
  const height = 400;
  const imageUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;

  return {
    imageUrl,
    prompt: `Minimalist placeholder for: ${title}`
  };
}
