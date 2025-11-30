import { Request, Response, NextFunction } from 'express';
import { adminService, ListQuery } from '../services/adminService';
import { translationService } from '../services/translationService';
import { discoveryService } from '../services/discoveryService';
import { topicService } from '../services/topicService';
import { resourceService } from '../services/resourceService';
import { aiService } from '../services/aiService';
import { authService } from '../services/authService';
import { runDescriptionJobNow } from '../jobs/descriptionJob';
import { CreateTopicSchema, UpdateTopicSchema } from '../models/Topic';
import { JwtPayload } from '../middleware/auth';
import { ObjectId } from 'mongodb';
import { ApiError } from '../middleware/errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const adminController = {
  /**
   * GET /api/admin/stats
   * Get dashboard statistics
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/resources
   * List all resources with pagination, filtering, and search
   * Supports semantic search when ?semantic=true is passed
   */
  async listResources(req: Request, res: Response, next: NextFunction) {
    try {
      const query: ListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        status: req.query.status as string,
        category: req.query.category as string,
        topic: req.query.topic as string,
        type: req.query.type as string,
        q: req.query.q as string,
        sort: req.query.sort as string,
        order: req.query.order as 'asc' | 'desc',
        semantic: req.query.semantic === 'true',
      };

      // Use semantic search if enabled and there's a search query
      const result = query.semantic && query.q
        ? await adminService.semanticSearch(query)
        : await adminService.listResources(query);

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/resources/:id
   * Get a single resource by ID
   */
  async getResource(req: Request, res: Response, next: NextFunction) {
    try {
      const resource = await adminService.getResource(req.params.id);
      res.json(resource);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/resources
   * Create a new resource
   */
  async createResource(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const resource = await adminService.createResource(req.body, req.user.id);
      res.status(201).json(resource);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/admin/resources/:id
   * Update a resource (non-status fields)
   */
  async updateResource(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const resource = await adminService.updateResource(req.params.id, req.body, req.user.id);
      res.json(resource);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/resources/:id
   * Delete a resource (soft delete to archived state)
   */
  async deleteResource(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await adminService.deleteResource(req.params.id, req.user.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/resources/:id/status
   * Update resource status
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { status, reason } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const resource = await adminService.updateStatus(req.params.id, status, req.user.id, reason);
      res.json(resource);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/categories
   * List all categories
   */
  async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await adminService.listCategories();
      res.json({ data: categories });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/categories
   * Create a new category
   */
  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const category = await adminService.createCategory(name, description);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/admin/categories/:id
   * Update a category
   */
  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      const category = await adminService.updateCategory(req.params.id, name, description);
      res.json(category);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/categories/:id
   * Delete a category (only if no resources use it)
   */
  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      await adminService.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/resources/:id/translations
   * Link an existing resource as a translation
   */
  async linkTranslation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { translationId, language, translationType } = req.body;
      const canonicalId = new ObjectId(req.params.id);

      // Validate translationId is valid ObjectId
      if (!ObjectId.isValid(translationId)) {
        return res.status(400).json({ error: 'Invalid translation ID format' });
      }

      const translationObjectId = new ObjectId(translationId);

      await translationService.linkTranslation(
        canonicalId,
        translationObjectId,
        language,
        translationType || 'human'
      );

      res.status(200).json({
        message: 'Translation linked successfully',
        canonicalId: canonicalId.toString(),
        translationId: translationObjectId.toString()
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/resources/:id/translations
   * Get all translations of a resource
   */
  async getTranslations(req: Request, res: Response, next: NextFunction) {
    try {
      const resourceId = new ObjectId(req.params.id);

      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid resource ID format' });
      }

      const translations = await translationService.getTranslations(resourceId);

      res.json({
        resourceId: resourceId.toString(),
        translations: translations.map(t => ({
          language: t.language,
          resourceId: t.resourceId.toString()
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/resources/:id/translations/machine
   * Create a machine translation of a resource
   */
  async createMachineTranslation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { language } = req.body;
      const resourceId = new ObjectId(req.params.id);

      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid resource ID format' });
      }

      const translation = await translationService.createMachineTranslation(
        resourceId,
        language,
        new ObjectId(req.user.id)
      );

      res.status(201).json({
        message: 'Machine translation created successfully',
        translation: {
          _id: translation._id?.toString(),
          title: translation.title,
          language: translation.language,
          canonicalId: translation.canonicalId?.toString(),
          isTranslation: translation.isTranslation
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/resources/:id/translations/:translationId
   * Unlink a translation from canonical resource
   */
  async unlinkTranslation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const canonicalId = new ObjectId(req.params.id);
      const translationId = new ObjectId(req.params.translationId);

      if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.translationId)) {
        return res.status(400).json({ error: 'Invalid resource ID format' });
      }

      await translationService.unlinkTranslation(canonicalId, translationId);

      res.status(200).json({
        message: 'Translation unlinked successfully',
        canonicalId: canonicalId.toString(),
        translationId: translationId.toString()
      });
    } catch (error) {
      next(error);
    }
  },

  // ============ Discovery Endpoints ============

  /**
   * POST /api/admin/discovery/run
   * Run the full discovery pipeline
   */
  async runDiscovery(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('Starting discovery pipeline...');
      const result = await discoveryService.runDiscovery();

      res.json({
        message: 'Discovery pipeline completed',
        discovered: result.discovered,
        duplicates: result.duplicates,
        errors: result.errors.length,
        errorDetails: result.errors.slice(0, 10), // First 10 errors
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/discovery/url
   * Discover a resource from a specific URL
   */
  async discoverFromUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const resource = await discoveryService.discoverFromUrl(url);

      if (resource) {
        res.status(201).json({
          message: 'Resource discovered and saved',
          resource,
        });
      } else {
        res.status(200).json({
          message: 'No resource found or URL already exists',
        });
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/discovery/pending
   * Get resources pending admin review
   */
  async getPendingDiscoveries(req: Request, res: Response, next: NextFunction) {
    try {
      const pending = await discoveryService.getPendingDiscoveries();

      res.json({
        count: pending.length,
        data: pending.map(r => ({
          _id: r._id?.toString(),
          title: r.title,
          description: r.description,
          url: r.url,
          resourceType: r.resourceType,
          discoveredFrom: r.discoveredFrom,
          createdAt: r.createdAt,
          tags: r.tags,
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/discovery/:id/approve
   * Approve a discovered resource
   */
  async approveDiscovery(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid resource ID format' });
      }

      const resourceId = new ObjectId(req.params.id);
      const userId = new ObjectId(req.user.id);

      const approved = await discoveryService.approveDiscovery(resourceId, userId);

      if (approved) {
        res.json({ message: 'Resource approved and published' });
      } else {
        res.status(404).json({ error: 'Resource not found or not in discovered status' });
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/discovery/:id/reject
   * Reject a discovered resource
   */
  async rejectDiscovery(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid resource ID format' });
      }

      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const resourceId = new ObjectId(req.params.id);
      const userId = new ObjectId(req.user.id);

      const rejected = await discoveryService.rejectDiscovery(resourceId, userId, reason);

      if (rejected) {
        res.json({ message: 'Resource rejected' });
      } else {
        res.status(404).json({ error: 'Resource not found or not in discovered status' });
      }
    } catch (error) {
      next(error);
    }
  },

  // ============ Topic Management Endpoints ============

  /**
   * GET /api/admin/topics
   * List all topics
   */
  async listTopics(req: Request, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const topics = await topicService.listTopics(includeInactive);
      res.json({ data: topics });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/topics/:id
   * Get a single topic
   */
  async getTopic(req: Request, res: Response, next: NextFunction) {
    try {
      const topic = await topicService.getTopicById(req.params.id);
      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      res.json(topic);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/topics
   * Create a new topic
   */
  async createTopic(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const validation = CreateTopicSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: validation.error.issues });
      }

      const topic = await topicService.createTopic(validation.data, new ObjectId(req.user.id));
      res.status(201).json(topic);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/admin/topics/:id
   * Update a topic
   */
  async updateTopic(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const validation = UpdateTopicSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: validation.error.issues });
      }

      const topic = await topicService.updateTopic(req.params.id, validation.data, new ObjectId(req.user.id));
      res.json(topic);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/topics/:id
   * Delete a topic and reassign its resources to the default topic
   */
  async deleteTopic(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const result = await topicService.deleteTopic(req.params.id, new ObjectId(req.user.id));
      res.json({
        message: 'Topic deleted successfully',
        reassignedCount: result.reassignedCount
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/topics/:id/regenerate-image
   * Regenerate AI image for a topic
   */
  async regenerateTopicImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const topic = await topicService.regenerateImage(req.params.id, new ObjectId(req.user.id));
      res.json(topic);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/topics/seed
   * Seed default topics
   */
  async seedTopics(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await topicService.seedDefaultTopics(new ObjectId(req.user.id));
      res.json({ message: 'Default topics seeded successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/topics/update-counts
   * Update resource counts for all topics
   */
  async updateTopicCounts(req: Request, res: Response, next: NextFunction) {
    try {
      await topicService.updateResourceCounts();
      res.json({ message: 'Topic resource counts updated' });
    } catch (error) {
      next(error);
    }
  },

  // ============ AI Tag Suggestion Endpoint ============

  /**
   * POST /api/admin/resources/suggest-tags
   * Suggest tags for a resource based on title and description
   * Uses Claude Haiku for fast, accurate tag generation
   */
  async suggestTags(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description } = req.body;

      if (!title && !description) {
        return res.status(400).json({ error: 'Title or description is required' });
      }

      const tags = await aiService.suggestTags(title || '', description || '');
      res.json({ tags });
    } catch (error) {
      next(error);
    }
  },

  // ============ AI Description Management Endpoints ============

  /**
   * POST /api/admin/resources/:id/generate-description
   * Generate AI description for a single resource
   * Uses Claude Haiku to analyze URL content and create a concise description
   */
  async generateDescription(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid resource ID format' });
      }

      // Get the resource
      const resource = await adminService.getResource(id);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Check if description is locked
      if (resource.descriptionLocked) {
        return res.status(400).json({ error: 'Description is locked. Unlock it first to regenerate.' });
      }

      // Generate description using AI
      const description = await aiService.generateDescription(resource.url, resource.title);

      // Update the resource with new description
      await adminService.updateResource(id, {
        description,
        descriptionSource: 'ai',
      }, req.user.id);

      res.json({
        message: 'Description generated successfully',
        description,
        source: 'ai'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/resources/:id/lock-description
   * Toggle the description lock for a resource
   */
  async toggleDescriptionLock(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { locked } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid resource ID format' });
      }

      if (typeof locked !== 'boolean') {
        return res.status(400).json({ error: 'locked must be a boolean' });
      }

      await adminService.updateResource(id, {
        descriptionLocked: locked,
      }, req.user.id);

      res.json({
        message: locked ? 'Description locked' : 'Description unlocked',
        locked
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/resources/batch-generate-descriptions
   * Generate descriptions for all resources that are missing them
   * Skips locked descriptions and processes sequentially with delays
   */
  async batchGenerateDescriptions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const userId = req.user.id;

      // Get resources without descriptions (or with very short ones)
      const result = await adminService.listResources({
        page: 1,
        limit: 1000, // Get all
      });

      const resourcesNeedingDescription = result.data.filter(r =>
        !r.description || r.description.length < 20
      ).filter(r =>
        !r.descriptionLocked
      );

      if (resourcesNeedingDescription.length === 0) {
        return res.json({
          message: 'No resources need descriptions',
          processed: 0,
          failed: 0
        });
      }

      // Process sequentially with delays to avoid rate limits
      let processed = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const resource of resourcesNeedingDescription) {
        try {
          const description = await aiService.generateDescription(
            resource.url,
            resource.title
          );

          await adminService.updateResource(resource._id!.toString(), {
            description,
            descriptionSource: 'ai',
          }, userId);

          processed++;
          console.log(`Generated description for: ${resource.title}`);

          // Add delay between requests (500ms)
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err: any) {
          failed++;
          errors.push(`${resource.title}: ${err.message}`);
          console.error(`Failed to generate description for ${resource.title}:`, err.message);
        }
      }

      res.json({
        message: 'Batch description generation complete',
        processed,
        failed,
        errors: errors.slice(0, 10) // Return first 10 errors
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/resources/description-stats
   * Get statistics about description completion
   */
  async getDescriptionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getDescriptionStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },

  // ============ Resource Cover Image Endpoints ============

  /**
   * POST /api/admin/resources/:id/regenerate-cover
   * Generate HBR-quality AI cover image for a resource
   * Uses all resource metadata (title, description, type, themes, workstreams)
   */
  async regenerateResourceCover(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;

      // Service handles all metadata fetching and validation
      await resourceService.generateCoverImage(id);

      // Return updated resource
      const updatedResource = await adminService.getResource(id);
      res.json(updatedResource);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/resources/:id/upload-cover
   * Upload a cover image for a resource (requires multer middleware)
   */
  async uploadResourceCover(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Upload the cover image
      await resourceService.uploadCoverImage(id, req.file.buffer);

      // Return updated resource
      const updatedResource = await adminService.getResource(id);
      res.json(updatedResource);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/resources/:id/cover
   * Delete cover image from a resource
   */
  async deleteResourceCover(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;

      await resourceService.deleteCoverImage(id);

      // Return updated resource
      const updatedResource = await adminService.getResource(id);
      res.json(updatedResource);
    } catch (error) {
      next(error);
    }
  },

  // ============ Resource Cleanup Endpoints ============

  /**
   * GET /api/admin/resources/validate-urls
   * Check all resource URLs for broken links (dry run)
   * Returns list of resources with broken URLs without deleting them
   */
  async validateResourceUrls(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const brokenResources = await adminService.findBrokenResourceUrls(limit);

      res.json({
        message: `Found ${brokenResources.length} resources with broken URLs`,
        count: brokenResources.length,
        resources: brokenResources.map(r => ({
          _id: r._id?.toString(),
          title: r.title,
          url: r.url,
          status: r.status,
          error: r.error
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/resources/cleanup-broken
   * Delete or archive resources with broken URLs
   * Requires confirmation in request body: { confirm: true, action: 'archive' | 'delete' }
   */
  async cleanupBrokenResources(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { confirm, action = 'archive' } = req.body;

      if (!confirm) {
        return res.status(400).json({
          error: 'Confirmation required. Send { confirm: true, action: "archive" | "delete" } to proceed'
        });
      }

      if (action !== 'archive' && action !== 'delete') {
        return res.status(400).json({
          error: 'Invalid action. Use "archive" or "delete"'
        });
      }

      const result = await adminService.cleanupBrokenResources(req.user.id, action);

      res.json({
        message: `Cleanup complete: ${result.processed} resources ${action === 'delete' ? 'deleted' : 'archived'}`,
        ...result
      });
    } catch (error) {
      next(error);
    }
  },

  // ============ Scheduled Jobs ============

  /**
   * POST /api/admin/jobs/fill-descriptions
   * Manually trigger the description fill job
   */
  async runDescriptionFillJob(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      console.log(`[Admin] Manual description fill triggered by ${req.user.email}`);
      const result = await runDescriptionJobNow();

      res.json({
        message: 'Description fill job completed',
        ...result
      });
    } catch (error) {
      next(error);
    }
  },

  // ============ User Management ============

  /**
   * GET /api/admin/users
   * List all users (admin only)
   */
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const users = await authService.listUsers();
      res.json({ data: users, total: users.length });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/users
   * Create a new admin user with welcome email
   */
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { email, name, sendEmail = true } = req.body;

      if (!email || !name) {
        return res.status(400).json({ error: 'Email and name are required' });
      }

      console.log(`[Admin] Creating new admin user: ${email} (by ${req.user.email})`);

      const result = await authService.createAdminUser(email, name, sendEmail);

      res.status(201).json({
        message: result.emailSent
          ? 'Admin user created and welcome email sent'
          : 'Admin user created (email not sent)',
        user: result.user,
        emailSent: result.emailSent,
        // Only include temporary password if email wasn't sent (for manual sharing)
        ...(result.emailSent ? {} : { temporaryPassword: result.temporaryPassword }),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/admin/users/:id/role
   * Update user role
   */
  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Valid role is required (admin or user)' });
      }

      // Prevent self-demotion
      if (req.user.id === id && role === 'user') {
        return res.status(400).json({ error: 'You cannot demote yourself' });
      }

      console.log(`[Admin] Updating role for user ${id} to ${role} (by ${req.user.email})`);

      const user = await authService.updateUserRole(id, role);

      res.json({
        message: 'User role updated',
        user,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/users/:id/resend-welcome
   * Resend welcome email with new temporary password
   */
  async resendWelcomeEmail(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;

      console.log(`[Admin] Resending welcome email for user ${id} (by ${req.user.email})`);

      const result = await authService.resendWelcomeEmail(id);

      res.json({
        message: result.emailSent
          ? 'Welcome email resent with new temporary password'
          : 'Failed to send email - new password generated',
        emailSent: result.emailSent,
        // Only include temporary password if email wasn't sent
        ...(result.emailSent ? {} : { temporaryPassword: result.temporaryPassword }),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/users/:id
   * Delete a user
   */
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;

      // Prevent self-deletion
      if (req.user.id === id) {
        return res.status(400).json({ error: 'You cannot delete yourself' });
      }

      console.log(`[Admin] Deleting user ${id} (by ${req.user.email})`);

      await authService.deleteUser(id);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
};
