import { Router } from 'express';
import publicRoutes from './public';
import adminRoutes from './admin';
import chatRoutes from './chat';

const router = Router();

// Mount route modules
router.use('/api', publicRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/chat', chatRoutes);

export default router;
