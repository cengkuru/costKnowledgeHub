import { Router } from 'express';
import { resourceController } from '../controllers/resourceController';
import { searchController } from '../controllers/searchController';
import { authController } from '../controllers/authController';
import { imageController } from '../controllers/imageController';
import { validateBody } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { aiLimiter, authLimiter } from '../middleware/rateLimiter';
import { UserRegistrationSchema, UserLoginSchema, UpdatePasswordSchema, UpdateEmailSchema } from '../models/User';
import { z } from 'zod';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Resource routes (public)
router.get('/resources', resourceController.getResources);
router.get('/resources/:id', resourceController.getResourceById);
router.get('/resources/:id/cover', imageController.getCover);
router.post('/interact/:id', resourceController.incrementClicks);
router.get('/popular', resourceController.getPopularResources);
router.get('/featured', resourceController.getFeaturedResources);

// Topics route (public) - returns topics with images for filtering
router.get('/topics', resourceController.getTopics);

// Search routes (rate-limited)
// Main hybrid search endpoint
router.post('/search', aiLimiter, searchController.search);

// Keyword search endpoint
const KeywordSearchSchema = z.object({ query: z.string().min(1) });
router.post('/search/keyword', aiLimiter, validateBody(KeywordSearchSchema), searchController.keywordSearch);

// Semantic search endpoint
const SemanticSearchSchema = z.object({ query: z.string().min(1) });
router.post('/search/semantic', aiLimiter, validateBody(SemanticSearchSchema), searchController.semanticSearch);

// Translation route (rate-limited) - TODO: implement in searchController
// const TranslateSchema = z.object({
//   targetLang: z.enum(['en', 'es', 'pt']).optional(),
// });
// router.post('/translate', aiLimiter, validateBody(TranslateSchema), searchController.translateResources);

// Auth routes (rate-limited)
router.post(
  '/auth/register',
  authLimiter,
  validateBody(UserRegistrationSchema),
  authController.register
);
router.post('/auth/login', authLimiter, validateBody(UserLoginSchema), authController.login);
router.post('/auth/refresh', authLimiter, authController.refresh);
router.post(
  '/auth/forgot-password',
  authLimiter,
  validateBody(z.object({ email: z.string().email() })),
  authController.forgotPassword
);
router.post(
  '/auth/reset-password',
  authLimiter,
  validateBody(z.object({
    email: z.string().email(),
    token: z.string().min(1),
    newPassword: z.string().min(8),
  })),
  authController.resetPassword
);

// Protected auth routes
router.get('/auth/me', authenticate, authController.getCurrentUser);
router.put('/auth/me', authenticate, authController.updateCurrentUser);
router.put('/auth/password', authenticate, validateBody(UpdatePasswordSchema), authController.updatePassword);
router.put('/auth/email', authenticate, validateBody(UpdateEmailSchema), authController.updateEmail);
router.post('/auth/logout', authenticate, authController.logout);
router.post('/auth/logout-all', authenticate, authController.logoutAll);

export default router;
