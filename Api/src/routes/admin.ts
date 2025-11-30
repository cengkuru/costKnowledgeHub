import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import upload from '../middleware/upload';
import { z } from 'zod';
import { CreateResourceSchema, UpdateResourceSchema, UpdateStatusSchema } from '../models/Resource';
import { CreateTopicSchema, UpdateTopicSchema } from '../models/Topic';

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

// ============ AI Tag Suggestion Endpoints ============

// Suggest tags for a resource based on title and description
router.post('/resources/suggest-tags', validateBody(z.object({
  title: z.string().optional(),
  description: z.string().optional()
})), adminController.suggestTags);

// ============ AI Description Management Endpoints ============

// Get description statistics
router.get('/resources/description-stats', adminController.getDescriptionStats);

// Generate AI description for all resources missing them (batch)
router.post('/resources/batch-generate-descriptions', adminController.batchGenerateDescriptions);

// Generate AI description for a single resource
router.post('/resources/:id/generate-description', adminController.generateDescription);

// Toggle description lock for a resource
router.post('/resources/:id/lock-description', validateBody(z.object({
  locked: z.boolean()
})), adminController.toggleDescriptionLock);

// ============ Resource Cover Image Endpoints ============

// Regenerate AI cover image for a resource
router.post('/resources/:id/regenerate-cover', adminController.regenerateResourceCover);

// Upload a cover image for a resource
router.post('/resources/:id/upload-cover', upload.single('cover'), adminController.uploadResourceCover);

// Delete cover image from a resource
router.delete('/resources/:id/cover', adminController.deleteResourceCover);

// ============ Resource Cleanup Endpoints ============

// Validate resource URLs (dry run - find broken links)
router.get('/resources/validate-urls', adminController.validateResourceUrls);

// Cleanup broken resources (archive or delete)
router.post('/resources/cleanup-broken', validateBody(z.object({
  confirm: z.boolean(),
  action: z.enum(['archive', 'delete']).default('archive')
})), adminController.cleanupBrokenResources);

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

// ============ Scheduled Jobs ============

// Manually trigger description fill job
router.post('/jobs/fill-descriptions', adminController.runDescriptionFillJob);

// ============ User Management ============

// List all users
router.get('/users', adminController.listUsers);

// Create a new admin user (sends welcome email)
router.post('/users', validateBody(z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  sendEmail: z.boolean().optional().default(true)
})), adminController.createUser);

// Update user role
router.put('/users/:id/role', validateBody(z.object({
  role: z.enum(['admin', 'user'])
})), adminController.updateUserRole);

// Resend welcome email with new temporary password
router.post('/users/:id/resend-welcome', adminController.resendWelcomeEmail);

// Delete a user
router.delete('/users/:id', adminController.deleteUser);

// ============ Usage Analytics ============

// Get quick usage stats (for dashboard)
router.get('/usage/stats', adminController.getUsageQuickStats);

// Get detailed usage analytics
router.get('/usage/analytics', adminController.getUsageAnalytics);

// Get recent activity feed
router.get('/usage/recent', adminController.getRecentActivity);

export default router;
