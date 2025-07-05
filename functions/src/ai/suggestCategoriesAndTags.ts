import { onRequest } from 'firebase-functions/v2/https';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Generate AI-powered category and tag suggestions for CoST Knowledge Hub
 */
interface SuggestRequest {
  title?: string;
  description?: string;
  resourceType?: string;
  generateDefaults?: boolean;
}

interface CategorySuggestion {
  id: string;
  name: string;
  description: string;
  order: number;
}

interface TagSuggestion {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  category: string;
  confidence?: number;
}

interface SuggestResponse {
  categories: CategorySuggestion[];
  tags: TagSuggestion[];
}

// CoST-specific color palette for tags
const TAG_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#06B6D4', // cyan
  '#6366F1', // indigo
  '#84CC16', // lime
  '#059669', // green
  '#7C3AED', // purple
  '#DC2626', // red
  '#78716C', // stone
  '#0EA5E9', // sky
];

// Material Icons mapping for different topics
const ICON_MAPPING: Record<string, string> = {
  // Infrastructure types
  'roads': 'directions_car',
  'water': 'water_drop',
  'energy': 'bolt',
  'buildings': 'apartment',
  'transport': 'directions_transit',
  
  // Transparency themes
  'disclosure': 'visibility',
  'accountability': 'account_balance',
  'monitoring': 'assessment',
  'procurement': 'shopping_cart',
  'assurance': 'verified',
  'engagement': 'groups',
  
  // Document types
  'report': 'description',
  'guide': 'menu_book',
  'tool': 'build',
  'data': 'analytics',
  'policy': 'policy',
  'template': 'content_paste',
  
  // Stages
  'planning': 'architecture',
  'implementation': 'engineering',
  'completion': 'task_alt',
  'maintenance': 'handyman',
  
  // Default
  'default': 'label'
};

export const suggestCategoriesAndTags = onRequest({
  maxInstances: 10,
  cors: ['http://localhost:4200', 'https://knowledgehub-2ed2f.web.app', 'https://knowledgehub-2ed2f.firebaseapp.com'],
}, async (request, response) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    response.set('Access-Control-Allow-Origin', request.headers.origin || '*');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.status(204).send('');
    return;
  }

  try {
    // Verify authentication
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    // Optional: Check if user is admin
    const userDoc = await getFirestore().collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'admin') {
      response.status(403).json({ error: 'Admin access required' });
      return;
    }

    const data = request.body as SuggestRequest;

    // Generate suggestions based on input or defaults
    let suggestions: SuggestResponse;
    
    if (data.generateDefaults) {
      suggestions = await generateDefaultCategoriesAndTags();
    } else {
      suggestions = await generateContextualSuggestions(data);
    }

    response.json({
      result: {
        success: true,
        ...suggestions
      }
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    response.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

/**
 * Generate comprehensive default categories and tags for CoST
 */
async function generateDefaultCategoriesAndTags(): Promise<SuggestResponse> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `You are an expert in infrastructure transparency and the CoST (Construction Sector Transparency) Initiative.

Generate a comprehensive set of categories and tags for organizing infrastructure transparency resources.

Context:
- CoST promotes transparency in public infrastructure through disclosure of data at all project phases
- The initiative operates in 20+ countries across Africa, Asia, Europe, and the Americas
- Key focus areas: disclosure, assurance, procurement, monitoring, stakeholder engagement, accountability
- Resources include: guides, reports, tools, datasets, policies, templates, case studies

Please generate:

1. CATEGORIES (8-10 total):
   - Include categories for: infrastructure sectors, transparency mechanisms, project lifecycle, stakeholder types, impact areas, document types
   - Each category should have: id (lowercase-hyphenated), name, description, order (1-10)

2. TAGS (50-75 total):
   - Cover all major infrastructure sectors (roads, water, energy, buildings, etc.)
   - Include CoST IDS (Infrastructure Data Standard) key concepts
   - Add transparency stages (pre-contract, contract, post-contract)
   - Include risk areas and best practices
   - Add geographic regions and country-specific tags
   - Each tag should have: id, name, appropriate category, suggested color (hex), relevant icon name

Format your response as JSON with this structure:
{
  "categories": [...],
  "tags": [...]
}

Make sure all suggestions are relevant to infrastructure transparency and global development.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  const suggestions = JSON.parse(jsonMatch[0]);
  
  // Enhance with proper formatting
  return formatSuggestions(suggestions);
}

/**
 * Generate contextual suggestions based on specific input
 */
async function generateContextualSuggestions(data: SuggestRequest): Promise<SuggestResponse> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `You are an expert in infrastructure transparency and the CoST Initiative.

Based on the following resource information, suggest relevant categories and tags:

Title: ${data.title || 'Not provided'}
Description: ${data.description || 'Not provided'}
Resource Type: ${data.resourceType || 'Not provided'}

Context:
- This is for the CoST Knowledge Hub platform
- Focus on infrastructure transparency themes
- Consider global applicability

Please suggest:
1. 2-3 relevant categories from standard CoST categories
2. 5-10 specific tags that would help users find this resource

Format as JSON:
{
  "categories": [...],
  "tags": [...]
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  const suggestions = JSON.parse(jsonMatch[0]);
  return formatSuggestions(suggestions);
}

/**
 * Format and validate AI suggestions
 */
function formatSuggestions(raw: any): SuggestResponse {
  const categories: CategorySuggestion[] = [];
  const tags: TagSuggestion[] = [];
  
  // Format categories
  if (raw.categories && Array.isArray(raw.categories)) {
    raw.categories.forEach((cat: any, index: number) => {
      categories.push({
        id: cat.id || generateId(cat.name),
        name: cat.name,
        description: cat.description || '',
        order: cat.order || index + 1
      });
    });
  }
  
  // Format tags with proper colors and icons
  if (raw.tags && Array.isArray(raw.tags)) {
    raw.tags.forEach((tag: any, index: number) => {
      const icon = findBestIcon(tag.name, tag.icon);
      tags.push({
        id: tag.id || generateId(tag.name),
        name: tag.name,
        color: tag.color || TAG_COLORS[index % TAG_COLORS.length],
        icon: icon,
        description: tag.description,
        category: tag.category || 'other',
        confidence: tag.confidence || 0.8
      });
    });
  }
  
  return { categories, tags };
}

/**
 * Generate a valid ID from a name
 */
function generateId(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

/**
 * Find the best matching Material Icon for a tag
 */
function findBestIcon(tagName: string, suggestedIcon?: string): string {
  if (suggestedIcon && isValidMaterialIcon(suggestedIcon)) {
    return suggestedIcon;
  }
  
  const lowercaseName = tagName.toLowerCase();
  
  // Check direct mappings
  for (const [keyword, icon] of Object.entries(ICON_MAPPING)) {
    if (lowercaseName.includes(keyword)) {
      return icon;
    }
  }
  
  // Default icons based on patterns
  if (lowercaseName.includes('country') || lowercaseName.includes('region')) {
    return 'public';
  }
  if (lowercaseName.includes('risk') || lowercaseName.includes('issue')) {
    return 'warning';
  }
  if (lowercaseName.includes('success') || lowercaseName.includes('impact')) {
    return 'trending_up';
  }
  if (lowercaseName.includes('stakeholder') || lowercaseName.includes('community')) {
    return 'people';
  }
  
  return 'label';
}

/**
 * Validate if an icon name is a valid Material Icon
 * (In production, you'd have a comprehensive list)
 */
function isValidMaterialIcon(icon: string): boolean {
  const commonIcons = [
    'label', 'folder', 'description', 'visibility', 'build', 'assessment',
    'account_balance', 'public', 'people', 'groups', 'star', 'bookmark',
    'flag', 'location_on', 'analytics', 'trending_up', 'warning', 'info'
  ];
  return commonIcons.includes(icon);
}