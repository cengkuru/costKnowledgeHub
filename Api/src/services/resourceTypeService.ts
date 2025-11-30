import { ObjectId } from 'mongodb';
import { getDatabase } from '../db';
import {
  ResourceTypeModel,
  RESOURCE_TYPES_COLLECTION_NAME,
  CreateResourceTypeInput,
  UpdateResourceTypeInput,
  DEFAULT_TYPE_ICONS,
} from '../models/ResourceTypeModel';
import { ApiError } from '../middleware/errorHandler';
import { aiService } from './aiService';

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

export const resourceTypeService = {
  /**
   * List all resource types
   */
  async listTypes(includeInactive = false): Promise<ResourceTypeModel[]> {
    const db = await getDatabase();
    const query = includeInactive ? {} : { isActive: true };

    return await db
      .collection<ResourceTypeModel>(RESOURCE_TYPES_COLLECTION_NAME)
      .find(query)
      .sort({ displayOrder: 1, name: 1 })
      .toArray();
  },

  /**
   * Get a single resource type by ID
   */
  async getTypeById(id: string): Promise<ResourceTypeModel | null> {
    const db = await getDatabase();

    if (!ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid resource type ID');
    }

    return await db
      .collection<ResourceTypeModel>(RESOURCE_TYPES_COLLECTION_NAME)
      .findOne({ _id: new ObjectId(id) });
  },

  /**
   * Get a resource type by slug
   */
  async getTypeBySlug(slug: string): Promise<ResourceTypeModel | null> {
    const db = await getDatabase();
    return await db
      .collection<ResourceTypeModel>(RESOURCE_TYPES_COLLECTION_NAME)
      .findOne({ slug });
  },

  /**
   * Create a new resource type
   */
  async createType(input: CreateResourceTypeInput, userId: ObjectId): Promise<ResourceTypeModel> {
    const db = await getDatabase();
    const collection = db.collection<ResourceTypeModel>(RESOURCE_TYPES_COLLECTION_NAME);
    const now = new Date();
    const slug = createSlug(input.name);

    // Check for duplicate slug
    const existing = await collection.findOne({ slug });
    if (existing) {
      throw new ApiError(409, 'A resource type with this name already exists');
    }

    // Get SVG icon - use provided, default, or AI-generated
    let svgIcon = input.svgIcon;
    let aiSuggestedIcon: string | undefined;

    if (!svgIcon) {
      // Check if we have a default icon
      svgIcon = DEFAULT_TYPE_ICONS[input.name];

      if (!svgIcon) {
        // Generate AI-suggested icon
        try {
          aiSuggestedIcon = await this.generateSvgIcon(input.name, input.description);
          svgIcon = aiSuggestedIcon;
        } catch (error) {
          console.warn('Failed to generate AI SVG icon:', error);
          // Use a generic fallback icon
          svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`;
        }
      }
    }

    const resourceType: ResourceTypeModel = {
      name: input.name,
      slug,
      description: input.description,
      svgIcon,
      aiSuggestedIcon,
      displayOrder: input.displayOrder || 0,
      isActive: input.isActive ?? true,
      resourceCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const result = await collection.insertOne(resourceType);
    return { ...resourceType, _id: result.insertedId };
  },

  /**
   * Update a resource type
   */
  async updateType(id: string, input: UpdateResourceTypeInput, userId: ObjectId): Promise<ResourceTypeModel> {
    const db = await getDatabase();
    const collection = db.collection<ResourceTypeModel>(RESOURCE_TYPES_COLLECTION_NAME);

    if (!ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid resource type ID');
    }

    const updates: Partial<ResourceTypeModel> = {
      ...input,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    // If name changed, update slug
    if (input.name) {
      updates.slug = createSlug(input.name);

      // Check for duplicate slug
      const existing = await collection.findOne({
        slug: updates.slug,
        _id: { $ne: new ObjectId(id) }
      });
      if (existing) {
        throw new ApiError(409, 'A resource type with this name already exists');
      }
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ApiError(404, 'Resource type not found');
    }

    return result;
  },

  /**
   * Delete a resource type (only if no resources use it)
   */
  async deleteType(id: string): Promise<void> {
    const db = await getDatabase();

    if (!ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid resource type ID');
    }

    const resourceType = await this.getTypeById(id);
    if (!resourceType) {
      throw new ApiError(404, 'Resource type not found');
    }

    // Check if any resources use this type
    const resourceCount = await db
      .collection('resources')
      .countDocuments({ type: resourceType.name });

    if (resourceCount > 0) {
      throw new ApiError(400, `Cannot delete resource type: ${resourceCount} resources are using it`);
    }

    await db.collection(RESOURCE_TYPES_COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
  },

  /**
   * Generate a new AI SVG icon for a resource type
   */
  async regenerateIcon(id: string, userId: ObjectId): Promise<ResourceTypeModel> {
    const resourceType = await this.getTypeById(id);
    if (!resourceType) {
      throw new ApiError(404, 'Resource type not found');
    }

    const aiSuggestedIcon = await this.generateSvgIcon(resourceType.name, resourceType.description);

    return await this.updateType(id, { svgIcon: aiSuggestedIcon }, userId);
  },

  /**
   * Generate an SVG icon using AI
   */
  async generateSvgIcon(name: string, description: string): Promise<string> {
    try {
      // Use AI to generate SVG icon code
      const prompt = `Generate a minimal, clean SVG icon for a resource type called "${name}" with description: "${description}".

Requirements:
- Must be valid SVG markup
- Use viewBox="0 0 24 24"
- Use stroke="currentColor" and fill="none" for line icons
- Use stroke-width="2"
- Keep it simple with 1-3 path elements
- Should be recognizable at small sizes (24x24px)
- Modern, professional style suitable for a knowledge hub

Return ONLY the SVG code, no explanation. Start with <svg and end with </svg>.`;

      const response = await aiService.generateContent(prompt);

      // Extract SVG from response
      const svgMatch = response.match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch) {
        return svgMatch[0];
      }

      // If no valid SVG found, return a contextual fallback based on name
      return this.getContextualFallbackIcon(name);
    } catch (error) {
      console.error('Failed to generate SVG icon:', error);
      return this.getContextualFallbackIcon(name);
    }
  },

  /**
   * Get a contextual fallback icon based on type name
   */
  getContextualFallbackIcon(name: string): string {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('doc') || lowerName.includes('document')) {
      return DEFAULT_TYPE_ICONS['Documentation'];
    }
    if (lowerName.includes('tool')) {
      return DEFAULT_TYPE_ICONS['Tool'];
    }
    if (lowerName.includes('guide') || lowerName.includes('manual')) {
      return DEFAULT_TYPE_ICONS['Guide'];
    }
    if (lowerName.includes('visual') || lowerName.includes('chart') || lowerName.includes('graph')) {
      return DEFAULT_TYPE_ICONS['Visualization'];
    }
    if (lowerName.includes('data') || lowerName.includes('dataset')) {
      return DEFAULT_TYPE_ICONS['Dataset'];
    }
    if (lowerName.includes('code') || lowerName.includes('library') || lowerName.includes('api')) {
      return DEFAULT_TYPE_ICONS['Library/Code'];
    }

    // Generic fallback
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`;
  },

  /**
   * Update resource counts for all types
   */
  async updateResourceCounts(): Promise<void> {
    const db = await getDatabase();
    const types = await this.listTypes(true);

    for (const type of types) {
      const count = await db
        .collection('resources')
        .countDocuments({ type: type.name, status: 'published' });

      await db.collection(RESOURCE_TYPES_COLLECTION_NAME).updateOne(
        { _id: type._id },
        { $set: { resourceCount: count } }
      );
    }
  },

  /**
   * Seed default resource types
   */
  async seedDefaultTypes(userId: ObjectId): Promise<void> {
    const defaultTypes = [
      {
        name: 'Documentation',
        description: 'Technical documentation, specifications, and reference materials.',
      },
      {
        name: 'Tool',
        description: 'Interactive tools, validators, and utilities for working with data.',
      },
      {
        name: 'Guide',
        description: 'Step-by-step guides, tutorials, and how-to documents.',
      },
      {
        name: 'Visualization',
        description: 'Charts, graphs, dashboards, and visual data representations.',
      },
      {
        name: 'Dataset',
        description: 'Structured data files, databases, and data collections.',
      },
      {
        name: 'Library/Code',
        description: 'Code libraries, APIs, SDKs, and development resources.',
      },
    ];

    for (const typeData of defaultTypes) {
      try {
        await this.createType(typeData, userId);
        console.log(`Created resource type: ${typeData.name}`);
      } catch (error: any) {
        if (error.status === 409) {
          console.log(`Resource type already exists: ${typeData.name}`);
        } else {
          throw error;
        }
      }
    }
  },
};

export default resourceTypeService;
