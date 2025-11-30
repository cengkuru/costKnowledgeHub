import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import { CreateResourceSchema, UpdateResourceSchema, UpdateStatusSchema } from '../models/Resource';
import { CreateTopicSchema, UpdateTopicSchema } from '../models/Topic';
import { CreateResourceTypeSchema, UpdateResourceTypeSchema } from '../models/ResourceTypeModel';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// ============ Dashboard Stats ============
router.get('/stats', adminController.getStats);

// Validation schemas for categories
const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

// ============ Resource Endpoints ============

// List all resources with pagination, filtering, and search
router.get('/resources', adminController.listResources);

// Get a single resource
router.get('/resources/:id', adminController.getResource);

// Create a new resource
router.post('/resources', validateBody(CreateResourceSchema), adminController.createResource);

// Update a resource (non-status fields)
router.put('/resources/:id', validateBody(UpdateResourceSchema.partial()), adminController.updateResource);

// Update resource status
router.post('/resources/:id/status', validateBody(UpdateStatusSchema), adminController.updateStatus);

// Delete a resource (soft delete to archived)
router.delete('/resources/:id', adminController.deleteResource);

// ============ Category Endpoints ============

// List all categories
router.get('/categories', adminController.listCategories);

// Create a new category
router.post('/categories', validateBody(CreateCategorySchema), adminController.createCategory);

// Update a category
router.put('/categories/:id', validateBody(UpdateCategorySchema), adminController.updateCategory);

// Delete a category (only if no resources use it)
router.delete('/categories/:id', adminController.deleteCategory);

// ============ Translation Endpoints ============

// Link an existing resource as a translation
router.post('/resources/:id/translations', validateBody(z.object({
  translationId: z.string().min(1),
  language: z.enum(['en', 'es', 'fr', 'pt', 'uk', 'id', 'vi', 'th']),
  translationType: z.enum(['human', 'machine', 'hybrid']).optional().default('human')
})), adminController.linkTranslation);

// Get all translations of a resource
router.get('/resources/:id/translations', adminController.getTranslations);

// Create a machine translation
router.post('/resources/:id/translations/machine', validateBody(z.object({
  language: z.enum(['en', 'es', 'fr', 'pt', 'uk', 'id', 'vi', 'th'])
})), adminController.createMachineTranslation);

// Unlink a translation
router.delete('/resources/:id/translations/:translationId', adminController.unlinkTranslation);

// ============ Discovery Endpoints ============

// Run the discovery pipeline
router.post('/discovery/run', adminController.runDiscovery);

// Discover from a specific URL
router.post('/discovery/url', validateBody(z.object({
  url: z.string().url()
})), adminController.discoverFromUrl);

// Get pending discoveries for review
router.get('/discovery/pending', adminController.getPendingDiscoveries);

// Approve a discovered resource
router.post('/discovery/:id/approve', adminController.approveDiscovery);

// Reject a discovered resource
router.post('/discovery/:id/reject', validateBody(z.object({
  reason: z.string().min(1).max(500)
})), adminController.rejectDiscovery);

// ============ Topic Endpoints ============

// List all topics
router.get('/topics', adminController.listTopics);

// Get a single topic
router.get('/topics/:id', adminController.getTopic);

// Create a new topic
router.post('/topics', validateBody(CreateTopicSchema), adminController.createTopic);

// Update a topic
router.put('/topics/:id', validateBody(UpdateTopicSchema), adminController.updateTopic);

// Delete a topic
router.delete('/topics/:id', adminController.deleteTopic);

// Regenerate AI image for a topic
router.post('/topics/:id/regenerate-image', adminController.regenerateTopicImage);

// Seed default topics
router.post('/topics/seed', adminController.seedTopics);

// Update topic resource counts
router.post('/topics/update-counts', adminController.updateTopicCounts);

// ============ Resource Type Endpoints ============

// List all resource types
router.get('/types', adminController.listTypes);

// Get a single resource type
router.get('/types/:id', adminController.getType);

// Create a new resource type
router.post('/types', validateBody(CreateResourceTypeSchema), adminController.createType);

// Update a resource type
router.put('/types/:id', validateBody(UpdateResourceTypeSchema), adminController.updateType);

// Delete a resource type
router.delete('/types/:id', adminController.deleteType);

// Regenerate AI icon for a resource type
router.post('/types/:id/regenerate-icon', adminController.regenerateTypeIcon);

// Seed default resource types
router.post('/types/seed', adminController.seedTypes);

// Update type resource counts
router.post('/types/update-counts', adminController.updateTypeCounts);

export default router;
