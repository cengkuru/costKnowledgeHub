import { Router } from 'express';
import publicRoutes from './public';
import adminRoutes from './admin';
import chatRoutes from './chat';
import insightsRoutes from './insights';

const router = Router();

// Mount route modules
router.use('/api', publicRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/chat', chatRoutes);
router.use('/api', insightsRoutes);

export default router;
