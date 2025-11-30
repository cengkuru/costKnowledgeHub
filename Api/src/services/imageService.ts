/**
 * Image Generation Service
 * Generates contextual cover images for resources
 * Uses themed Unsplash images; can be upgraded to Imagen when needed
 */

// Resource type to Unsplash query mapping
const TYPE_QUERIES: Record<string, string> = {
  guidance: 'infrastructure-blueprint,architecture',
  case_study: 'construction-site,infrastructure-project',
  tool: 'software-dashboard,data-analytics',
  template: 'document-business,office-template',
  research: 'data-analysis,research-paper',
  training: 'education-workshop,training-classroom',
  policy: 'government-building,policy-document',
  assurance_report: 'inspection-audit,quality-control',
  news: 'infrastructure-development,city-skyline',
};

// Theme to Unsplash query mapping
const THEME_QUERIES: Record<string, string> = {
  climate: 'sustainable-infrastructure,green-building',
  environmental: 'environmental-assessment,eco-construction',
  procurement: 'business-contract,procurement-bidding',
  project_monitoring: 'construction-progress,site-inspection',
  data_standards: 'data-visualization,structured-data',
  msg_governance: 'stakeholder-meeting,governance',
  digital_tools: 'digital-technology,software-interface',
  impact_measurement: 'metrics-dashboard,impact-assessment',
  local_government: 'municipal-services,local-community',
  gender: 'diverse-workforce,inclusive-workplace',
  beneficial_ownership: 'corporate-transparency,ownership',
  social_safeguards: 'community-development,social-impact',
};

export interface ImageGenerationRequest {
  resourceId: string;
  title: string;
  description: string;
  resourceType: string;
  themes?: string[];
}

export interface ImageGenerationResult {
  imageUrl: string;
  prompt: string;
  generatedAt: Date;
}

export const imageService = {
  /**
   * Generate a cover image for a resource
   */
  async generateCoverImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const { resourceType, themes = [] } = request;

    const imageUrl = this.getPlaceholderImage(resourceType, themes);
    const prompt = this.buildImagePrompt(request.title, request.description, resourceType, themes);

    return {
      imageUrl,
      prompt,
      generatedAt: new Date(),
    };
  },

  /**
   * Build an image generation prompt based on resource metadata
   */
  buildImagePrompt(
    title: string,
    description: string,
    resourceType: string,
    themes: string[]
  ): string {
    const typeDesc = TYPE_QUERIES[resourceType] || 'infrastructure';
    const themeDesc = themes.length > 0 ? THEME_QUERIES[themes[0]] || '' : '';
    const shortTitle = title.substring(0, 50);

    return `You are an editorial art director creating an HBR-style cover illustration for an infrastructure transparency article.
Article title: "${shortTitle}". Type: ${typeDesc}. Theme: ${themeDesc}. Description: ${description}.
Produce one strong, metaphor-driven scene (no literal depictions, no stock clichés, no people doing business). Use clean composition, bold negative space, limited 2-4 color palette (slate blue, brick red, mustard, cream), and subtle surrealism. Avoid gradients and busy elements. Favor geometric clarity and a single focal object that encodes the core tension. Aspect ratio 16:9 with text-safe negative space in the top-left. High contrast, magazine-cover ready.`;
  },

  /**
   * Get a themed placeholder image URL from Unsplash
   */
  getPlaceholderImage(resourceType: string, themes: string[]): string {
    // Build query from type and themes
    let query = TYPE_QUERIES[resourceType] || 'infrastructure-transparency';

    // Add theme-specific terms
    if (themes.length > 0) {
      const themeQuery = THEME_QUERIES[themes[0]];
      if (themeQuery) {
        query = themeQuery;
      }
    }

    // Use Unsplash Source for consistent, high-quality images
    const sig = Buffer.from(query).toString('base64').slice(0, 10);
    return `https://source.unsplash.com/1200x630/?${encodeURIComponent(query)}&sig=${sig}`;
  },

  /**
   * Generate cover images for all resources without images
   */
  async generateMissingCoverImages(
    resources: Array<{
      _id: string;
      title: string;
      description: string;
      resourceType: string;
      themes?: string[];
      coverImage?: string;
    }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const resource of resources) {
      if (resource.coverImage) {
        continue;
      }

      try {
        await this.generateCoverImage({
          resourceId: resource._id,
          title: resource.title,
          description: resource.description,
          resourceType: resource.resourceType,
          themes: resource.themes,
        });

        success++;
      } catch (error) {
        console.error(`Failed to generate cover for ${resource.title}:`, error);
        failed++;
      }
    }

    return { success, failed };
  },
};
