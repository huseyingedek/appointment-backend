import { Router } from 'express';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import ownerRoutes from './ownerRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/owner', ownerRoutes);

export default router;