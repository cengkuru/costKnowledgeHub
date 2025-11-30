import { ObjectId } from 'mongodb';
import { getDatabase } from '../db';
import { Topic, TOPICS_COLLECTION_NAME, CreateTopicInput, UpdateTopicInput, DEFAULT_TOPIC_SLUG } from '../models/Topic';
import { ApiError } from '../middleware/errorHandler';
import { aiService } from './aiService';
import { imageStorageService } from './imageStorageService';
import { INDEPENDENT_REVIEW_ALIASES, resolveIndependentReviewName } from '../utils/topicCategory';

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

export const topicService = {
  /**
   * List all topics
   */
  async listTopics(includeInactive = false): Promise<Topic[]> {
    const db = await getDatabase();
    const query = includeInactive ? {} : { isActive: true };

    return await db
      .collection<Topic>(TOPICS_COLLECTION_NAME)
      .find(query)
      .sort({ displayOrder: 1, name: 1 })
      .toArray();
  },

  /**
   * Get a single topic by ID
   */
  async getTopicById(id: string): Promise<Topic | null> {
    const db = await getDatabase();

    if (!ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid topic ID');
    }

    return await db
      .collection<Topic>(TOPICS_COLLECTION_NAME)
      .findOne({ _id: new ObjectId(id) });
  },

  /**
   * Get a topic by slug
   */
  async getTopicBySlug(slug: string): Promise<Topic | null> {
    const db = await getDatabase();
    return await db
      .collection<Topic>(TOPICS_COLLECTION_NAME)
      .findOne({ slug });
  },

  /**
   * Create a new topic
   */
  async createTopic(input: CreateTopicInput, userId: ObjectId): Promise<Topic> {
    const db = await getDatabase();
    const collection = db.collection<Topic>(TOPICS_COLLECTION_NAME);
    const now = new Date();
    const slug = createSlug(input.name);

    // Check for duplicate slug
    const existing = await collection.findOne({ slug });
    if (existing) {
      throw new ApiError(409, 'A topic with this name already exists');
    }

    // Create the topic first without image
    const topic: Topic = {
      name: input.name,
      slug,
      description: input.description,
      displayOrder: input.displayOrder || 0,
      isActive: input.isActive ?? true,
      resourceCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const insertResult = await collection.insertOne(topic);
    const topicId = insertResult.insertedId.toString();

    // Generate AI image for the topic (now we have the ID)
    let aiGeneratedImage: string | undefined;
    try {
      aiGeneratedImage = await this.generateTopicImage(topicId, input.name, input.description);
      // Update the topic with the image
      await collection.updateOne(
        { _id: insertResult.insertedId },
        { $set: { aiGeneratedImage } }
      );
    } catch (error) {
      console.warn('Failed to generate AI image for topic:', error);
    }

    return { ...topic, _id: insertResult.insertedId, aiGeneratedImage };
  },

  /**
   * Update a topic
   */
  async updateTopic(id: string, input: UpdateTopicInput, userId: ObjectId): Promise<Topic> {
    const db = await getDatabase();
    const collection = db.collection<Topic>(TOPICS_COLLECTION_NAME);

    if (!ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid topic ID');
    }

    // Check if this is the default topic
    const existingTopic = await this.getTopicById(id);
    if (!existingTopic) {
      throw new ApiError(404, 'Topic not found');
    }

    // Prevent editing name/description of the default topic
    if (existingTopic.isDefault || existingTopic.slug === DEFAULT_TOPIC_SLUG) {
      if (input.name || input.description) {
        throw new ApiError(400, 'Cannot edit the name or description of the default topic');
      }
    }

    const updates: Partial<Topic> = {
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
        throw new ApiError(409, 'A topic with this name already exists');
      }
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ApiError(404, 'Topic not found');
    }

    return result;
  },

  /**
   * Get or create the default "Uncategorized" topic
   */
  async getOrCreateDefaultTopic(userId: ObjectId): Promise<Topic> {
    const db = await getDatabase();
    const collection = db.collection<Topic>(TOPICS_COLLECTION_NAME);

    // Check if default topic exists
    let defaultTopic = await collection.findOne({ slug: DEFAULT_TOPIC_SLUG });

    if (!defaultTopic) {
      // Create the default topic
      const now = new Date();
      const topic: Topic = {
        name: 'Uncategorized',
        slug: DEFAULT_TOPIC_SLUG,
        description: 'Resources that have not been assigned to a specific topic',
        displayOrder: 9999, // Always last
        isActive: true,
        isDefault: true,
        resourceCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      };

      const result = await collection.insertOne(topic);
      defaultTopic = { ...topic, _id: result.insertedId };
    }

    return defaultTopic;
  },

  /**
   * Delete a topic and reassign its resources to the default topic
   * Returns the number of resources that were reassigned
   */
  async deleteTopic(id: string, userId: ObjectId): Promise<{ reassignedCount: number }> {
    const db = await getDatabase();

    if (!ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid topic ID');
    }

    const topic = await this.getTopicById(id);
    if (!topic) {
      throw new ApiError(404, 'Topic not found');
    }

    // Prevent deletion of the default topic
    if (topic.isDefault || topic.slug === DEFAULT_TOPIC_SLUG) {
      throw new ApiError(400, 'Cannot delete the default topic');
    }

    // Get or create the default topic for reassignment
    const defaultTopic = await this.getOrCreateDefaultTopic(userId);

    // Count resources that will be reassigned
    const resourceCount = await db
      .collection('resources')
      .countDocuments({ topics: topic.name });

    // Reassign resources from deleted topic to default topic
    if (resourceCount > 0) {
      // First, add the default topic to resources that have the topic being deleted
      await db.collection('resources').updateMany(
        { topics: topic.name },
        { $addToSet: { topics: defaultTopic.name } }
      );

      // Then, remove the deleted topic from all resources
      await db.collection('resources').updateMany(
        { topics: topic.name },
        { $pull: { topics: topic.name } } as any
      );

      // Update the default topic's resource count
      await this.updateResourceCounts();
    }

    // Delete the topic's image from storage if it exists
    if (topic.aiGeneratedImage) {
      try {
        await imageStorageService.deleteTopicImage(topic.aiGeneratedImage);
      } catch (error) {
        console.warn('Failed to delete topic image:', error);
      }
    }

    // Delete the topic
    await db.collection(TOPICS_COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });

    return { reassignedCount: resourceCount };
  },

  /**
   * Regenerate AI image for a topic
   */
  async regenerateImage(id: string, userId: ObjectId): Promise<Topic> {
    console.log('=== Topic Image Regeneration Started ===');
    console.log('Topic ID:', id);

    const db = await getDatabase();
    const collection = db.collection<Topic>(TOPICS_COLLECTION_NAME);

    if (!ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid topic ID');
    }

    const topic = await this.getTopicById(id);
    if (!topic) {
      throw new ApiError(404, 'Topic not found');
    }

    console.log('Topic found:', { name: topic.name, hasExistingImage: !!topic.aiGeneratedImage });

    // Delete old image from GCS if it exists
    if (topic.aiGeneratedImage) {
      console.log('Deleting old image...');
      await imageStorageService.deleteTopicImage(topic.aiGeneratedImage);
    }

    // Generate new image and upload to GCS
    const aiGeneratedImage = await this.generateTopicImage(id, topic.name, topic.description);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          aiGeneratedImage,
          updatedAt: new Date(),
          updatedBy: userId,
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ApiError(404, 'Topic not found');
    }

    console.log('=== Topic Image Regeneration Complete ===');
    console.log('New image URL:', aiGeneratedImage.substring(0, 80) + '...');

    return result;
  },

  /**
   * Generate an AI image for a topic using Gemini 3 Pro Image Preview and upload to GCS
   * Uses Claude Haiku to build consistent, HBR-style prompts before image generation
   */
  async generateTopicImage(topicId: string, name: string, description: string): Promise<string> {
    console.log('=== Generating Topic Image ===');
    console.log('Topic:', name);

    try {
      // Stage 1: Use Haiku to build a consistent prompt
      const prompt = await aiService.buildPromptWithHaiku(name, description);
      console.log('Final prompt for image generation:', prompt);

      // Stage 2: Generate image with Gemini
      const imageBuffer = await aiService.generateImage(prompt);

      // Upload to GCS if configured, otherwise return as data URL
      if (imageStorageService.isConfigured()) {
        console.log('Uploading to GCS...');
        const gcsUrl = await imageStorageService.uploadTopicImage(topicId, imageBuffer);
        return gcsUrl;
      } else {
        console.log('GCS not configured, using base64 data URL');
        const base64 = imageBuffer.toString('base64');
        return `data:image/png;base64,${base64}`;
      }
    } catch (error) {
      console.warn('AI image generation failed, falling back to gradient:', (error as any)?.message || error);
      return this.generateFallbackImage(name);
    }
  },

  /**
   * Build a consistent illustration prompt based on topic name
   * Uses HBR-style abstract, conceptual, thought-provoking imagery
   */
  buildIllustrationPrompt(name: string, description: string): string {
    // Base style instructions for HBR-inspired conceptual imagery
    const baseStyle = `
Style: Harvard Business Review cover art inspired. Abstract, conceptual, thought-provoking. Bold geometric shapes, sophisticated visual metaphors. NO people, NO humanoid figures, NO characters. Pure conceptual illustration.
Technique: Flat design with subtle gradients, layered geometric shapes, architectural forms, data visualization elements as art.
Color palette: Deep teal (#2A6478), rich coral (#D94F4F), warm amber (#E8A838), cream white (#F8F6F1). Bold contrast, professional warmth.
Composition: Asymmetric balance, negative space as a design element, bold shapes intersecting meaningfully.
Mood: Intellectual, forward-thinking, sophisticated, contemplative.
Quality: Editorial illustration quality, print-ready, museum-worthy conceptual art.
Absolutely NO: text, logos, watermarks, people, faces, hands, humanoid figures, cartoon elements, 3D renders.
Aspect ratio: 4:3 landscape.`;

    // Topic-specific abstract concepts
    const topicConcepts: Record<string, string> = {
      'oc4ids': `
Concept: "The Architecture of Open Data"
Visual metaphor: Interconnected transparent geometric blocks forming a bridge structure, with flowing data streams (represented as elegant curves) passing through. Layered transparency suggesting openness. Grid patterns representing standardization.
Key elements: Glass-like cubes, flowing ribbons, network nodes as circles, bridge silhouette integrated into abstract composition.`,

      'independent review': `
Concept: "The Lens of Accountability"
Visual metaphor: A large abstract magnifying lens or prism refracting light over geometric building forms. The refraction reveals hidden layers and patterns. Suggests scrutiny revealing truth.
Key elements: Prism/lens shape, light rays becoming spectrum, layered architectural forms, checkmark integrated as geometric shape.`,

      'assurance': `
Concept: "The Lens of Accountability"
Visual metaphor: A large abstract magnifying lens or prism refracting light over geometric building forms. The refraction reveals hidden layers and patterns. Suggests scrutiny revealing truth.
Key elements: Prism/lens shape, light rays becoming spectrum, layered architectural forms, checkmark integrated as geometric shape.`,

      'infrastructure transparency index': `
Concept: "Measuring What Matters"
Visual metaphor: Rising bar chart forms morphing into city skyline. Measurement marks as design elements. A scale or balance integrated abstractly. Numbers and metrics as artistic patterns.
Key elements: Ascending geometric bars, ruler/measurement marks as borders, cityscape silhouette, circular gauge elements.`,

      'guidance notes': `
Concept: "Pathways to Understanding"
Visual metaphor: Winding path or river of knowledge flowing through abstract landscape of geometric shapes. Waypoints marked by glowing nodes. Suggests journey and discovery.
Key elements: Flowing path/river shape, milestone markers, open book abstracted to geometric forms, compass rose element.`,

      'capacity building': `
Concept: "Growing Stronger Foundations"
Visual metaphor: Ascending terraced structure like a ziggurat or growing crystal formation. Each level builds on the previous. Seeds/roots at base transforming into sophisticated geometric forms at top.
Key elements: Stacked/terraced shapes, upward arrows integrated subtly, seed-to-crystal transformation, scaffolding patterns.`,

      'country programs': `
Concept: "Global Connections, Local Roots"
Visual metaphor: Abstract globe or map dissolving into connected geometric fragments. Regional shapes connected by elegant arcs. Unity in diversity through varied but harmonious shapes.
Key elements: Fragmented circle suggesting globe, connecting arcs, varied geometric shapes in regional clusters, grid overlay.`,

      'tools': `
Concept: "Instruments of Change"
Visual metaphor: Abstract toolkit - geometric shapes suggesting precision instruments arranged in purposeful composition. Gears and mechanical elements as art. Calculator/grid patterns.
Key elements: Geometric tool shapes (abstract wrench, gear, ruler), interlocking mechanisms, grid patterns, precision lines.`,

      'default': `
Concept: "Transparency in Motion"
Visual metaphor: Overlapping transparent planes revealing infrastructure patterns beneath. Data flows as elegant curves connecting geometric nodes. Glass architecture suggesting openness.
Key elements: Layered transparent rectangles, infrastructure silhouettes (bridge, building), flowing connection lines, node clusters.`,
    };

    // Find matching concept or use default
    const normalizedName = name.toLowerCase().trim();
    let concept = topicConcepts['default'];

    for (const [key, value] of Object.entries(topicConcepts)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        concept = value;
        break;
      }
    }

    // Add description context if provided
    const descriptionContext = description
      ? `\nTopic description: ${description}`
      : '';

    return `Create a Harvard Business Review style conceptual illustration for the topic "${name}".${descriptionContext}
${concept}
${baseStyle}`;
  },

  /**
   * Generate a fallback gradient placeholder image
   */
  generateFallbackImage(name: string): string {
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const hue = Math.abs(hash) % 360;
    const escapedName = name
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:hsl(${hue}, 70%, 50%);stop-opacity:1" />
            <stop offset="100%" style="stop-color:hsl(${(hue + 40) % 360}, 70%, 40%);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#grad)"/>
        <text x="200" y="150" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${escapedName}</text>
      </svg>
    `)}`;
  },

  /**
   * Update resource counts for all topics
   */
  async updateResourceCounts(): Promise<void> {
    const db = await getDatabase();
    const topics = await this.listTopics(true);
    const independentCategoryValues = Array.from(new Set([
      'Independent Reviews',
      'Independent Review',
      ...INDEPENDENT_REVIEW_ALIASES,
      ...INDEPENDENT_REVIEW_ALIASES.map(alias => alias.charAt(0).toUpperCase() + alias.slice(1)),
    ]));

    for (const topic of topics) {
      const categoryFilter =
        topic.name === 'Independent Reviews' || topic.name === 'Independent Review'
          ? { $in: independentCategoryValues }
          : topic.name;

      const count = await db
        .collection('resources')
        .countDocuments({ category: categoryFilter, status: 'published' });

      await db.collection(TOPICS_COLLECTION_NAME).updateOne(
        { _id: topic._id },
        { $set: { resourceCount: count } }
      );
    }
  },

  /**
   * Seed default topics from current categories
   */
  async seedDefaultTopics(userId: ObjectId): Promise<void> {
    const defaultTopics = [
      {
        name: 'OC4IDS',
        description: 'Standards, tools, and documentation for the Open Contracting for Infrastructure Data Standard.',
      },
      {
        name: 'Independent Reviews',
        description: 'Manuals and guides for conducting independent reviews and validation of infrastructure projects.',
      },
      {
        name: 'Infrastructure Transparency Index',
        description: 'Methodologies and calculation tools for the Infrastructure Transparency Index.',
      },
      {
        name: 'Guidance Notes',
        description: 'Best practices and detailed guidance notes for implementation and policy.',
      },
    ];

    for (const topicData of defaultTopics) {
      try {
        await this.createTopic(topicData, userId);
        console.log(`Created topic: ${topicData.name}`);
      } catch (error: any) {
        if (error.status === 409) {
          console.log(`Topic already exists: ${topicData.name}`);
        } else {
          throw error;
        }
      }
    }
  },
};

export default topicService;
