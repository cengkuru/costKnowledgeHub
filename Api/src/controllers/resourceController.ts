import { Request, Response, NextFunction } from 'express';
import { resourceService } from '../services/resourceService';
import { topicService } from '../services/topicService';
import { z } from 'zod';

const GetResourcesQuerySchema = z.object({
  category: z.string().optional(),
  type: z.string().optional(),
});

export const resourceController = {
  /**
   * GET /api/resources
   * Get all resources with optional filtering
   */
  async getResources(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, type } = req.query;

      const resources = await resourceService.getResources({
        category: category as string,
        type: type as string,
      });

      res.json(resources);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/resources/:id
   * Get a single resource by ID
   */
  async getResourceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const resource = await resourceService.getResourceById(id);

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      res.json(resource);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/interact/:id
   * Increment clicks for a resource
   */
  async incrementClicks(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const result = await resourceService.incrementClicks(id);

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/popular
   * Get popular resources
   */
  async getPopularResources(req: Request, res: Response, next: NextFunction) {
    try {
      const popularIds = await resourceService.getPopularResources();

      res.json(popularIds);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/featured
   * Get featured assurance/independent review resources
   */
  async getFeaturedResources(req: Request, res: Response, next: NextFunction) {
    try {
      const featured = await resourceService.getFeaturedResources();

      res.json(featured);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/resources (Admin only)
   * Create a new resource
   */
  async createResource(req: Request, res: Response, next: NextFunction) {
    try {
      const resource = await resourceService.createResource(req.body);

      res.status(201).json(resource);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/resources/:id (Admin only)
   * Update a resource
   */
  async updateResource(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const resource = await resourceService.updateResource(id, req.body);

      res.json(resource);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/resources/:id (Admin only)
   * Delete a resource
   */
  async deleteResource(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await resourceService.deleteResource(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/topics
   * Get all active topics with their images (public endpoint)
   */
  async getTopics(req: Request, res: Response, next: NextFunction) {
    try {
      const topics = await topicService.listTopics(false); // Only active topics

      // Return simplified topic data for public consumption
      const publicTopics = topics.map(topic => ({
        name: topic.name,
        slug: topic.slug,
        description: topic.description,
        image: topic.aiGeneratedImage || null,
        resourceCount: topic.resourceCount || 0,
      }));

      res.json(publicTopics);
    } catch (error) {
      next(error);
    }
  },
};
