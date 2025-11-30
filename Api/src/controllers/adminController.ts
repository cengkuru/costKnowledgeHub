import { Request, Response, NextFunction } from 'express';
import { adminService, ListQuery } from '../services/adminService';
import { translationService } from '../services/translationService';
import { discoveryService } from '../services/discoveryService';
import { topicService } from '../services/topicService';
import { resourceTypeService } from '../services/resourceTypeService';
import { CreateTopicSchema, UpdateTopicSchema } from '../models/Topic';
import { CreateResourceTypeSchema, UpdateResourceTypeSchema } from '../models/ResourceTypeModel';
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
      };

      const result = await adminService.listResources(query);
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

  // ============ Resource Type Management Endpoints ============

  /**
   * GET /api/admin/types
   * List all resource types
   */
  async listTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const types = await resourceTypeService.listTypes(includeInactive);
      res.json({ data: types });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/types/:id
   * Get a single resource type
   */
  async getType(req: Request, res: Response, next: NextFunction) {
    try {
      const type = await resourceTypeService.getTypeById(req.params.id);
      if (!type) {
        return res.status(404).json({ error: 'Resource type not found' });
      }
      res.json(type);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/types
   * Create a new resource type
   */
  async createType(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const validation = CreateResourceTypeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: validation.error.issues });
      }

      const type = await resourceTypeService.createType(validation.data, new ObjectId(req.user.id));
      res.status(201).json(type);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/admin/types/:id
   * Update a resource type
   */
  async updateType(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const validation = UpdateResourceTypeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: validation.error.issues });
      }

      const type = await resourceTypeService.updateType(req.params.id, validation.data, new ObjectId(req.user.id));
      res.json(type);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/types/:id
   * Delete a resource type
   */
  async deleteType(req: Request, res: Response, next: NextFunction) {
    try {
      await resourceTypeService.deleteType(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/types/:id/regenerate-icon
   * Regenerate AI SVG icon for a resource type
   */
  async regenerateTypeIcon(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const type = await resourceTypeService.regenerateIcon(req.params.id, new ObjectId(req.user.id));
      res.json(type);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/types/seed
   * Seed default resource types
   */
  async seedTypes(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await resourceTypeService.seedDefaultTypes(new ObjectId(req.user.id));
      res.json({ message: 'Default resource types seeded successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/types/update-counts
   * Update resource counts for all types
   */
  async updateTypeCounts(req: Request, res: Response, next: NextFunction) {
    try {
      await resourceTypeService.updateResourceCounts();
      res.json({ message: 'Resource type counts updated' });
    } catch (error) {
      next(error);
    }
  },
};
