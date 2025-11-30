/**
 * Image Controller
 * Handles cover image generation requests
 */

import { Request, Response, NextFunction } from 'express';
import { imageService } from '../services/imageService';
import { getDatabase } from '../db';
import { ObjectId } from 'mongodb';

export const imageController = {
  /**
   * POST /api/admin/resources/:id/generate-cover
   * Generate a cover image for a resource
   */
  async generateCover(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const db = await getDatabase();
      const collection = db.collection('resources');

      // Get the resource
      const resource = await collection.findOne({ _id: new ObjectId(id) });
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Generate cover image
      const result = await imageService.generateCoverImage({
        resourceId: id,
        title: resource.title,
        description: resource.description,
        resourceType: resource.resourceType,
        themes: resource.themes,
      });

      // Update the resource with the cover image URL
      await collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            coverImage: result.imageUrl,
            coverImagePrompt: result.prompt,
            coverImageGeneratedAt: result.generatedAt,
            updatedAt: new Date(),
          },
        }
      );

      res.json({
        success: true,
        coverImage: result.imageUrl,
        prompt: result.prompt,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/generate-all-covers
   * Generate cover images for all resources without images
   */
  async generateAllCovers(req: Request, res: Response, next: NextFunction) {
    try {
      const db = await getDatabase();
      const collection = db.collection('resources');

      // Get all resources without cover images
      const resources = await collection
        .find({
          status: 'published',
          $or: [
            { coverImage: { $exists: false } },
            { coverImage: null },
            { coverImage: '' },
          ],
        })
        .toArray();

      if (resources.length === 0) {
        return res.json({
          message: 'All resources already have cover images',
          processed: 0,
        });
      }

      // Generate covers (process in background for large batches)
      const result = await imageService.generateMissingCoverImages(
        resources.map(r => ({
          _id: r._id.toString(),
          title: r.title,
          description: r.description,
          resourceType: r.resourceType,
          themes: r.themes,
          coverImage: r.coverImage,
        }))
      );

      // Update resources with generated images
      for (const resource of resources) {
        const imageUrl = imageService.getPlaceholderImage(
          resource.resourceType,
          resource.themes || []
        );

        await collection.updateOne(
          { _id: resource._id },
          {
            $set: {
              coverImage: imageUrl,
              updatedAt: new Date(),
            },
          }
        );
      }

      res.json({
        message: 'Cover images generated',
        success: result.success,
        failed: result.failed,
        total: resources.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/resources/:id/cover
   * Get cover image for a resource (generates on-demand if missing)
   */
  async getCover(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const db = await getDatabase();
      const collection = db.collection('resources');

      // Try to find by ObjectId or slug
      let resource;
      try {
        resource = await collection.findOne({ _id: new ObjectId(id) });
      } catch {
        resource = await collection.findOne({ slug: id });
      }

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Return existing cover image
      if (resource.coverImage) {
        return res.json({ coverImage: resource.coverImage });
      }

      // Generate on-demand
      const imageUrl = imageService.getPlaceholderImage(
        resource.resourceType,
        resource.themes || []
      );

      // Update the resource
      await collection.updateOne(
        { _id: resource._id },
        {
          $set: {
            coverImage: imageUrl,
            updatedAt: new Date(),
          },
        }
      );

      res.json({ coverImage: imageUrl });
    } catch (error) {
      next(error);
    }
  },
};
