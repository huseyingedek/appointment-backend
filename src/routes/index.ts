import { Router } from 'express';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import ownerRoutes from './ownerRoutes';
import employeeRoutes from './employeeRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/owner', ownerRoutes);
router.use('/employees', employeeRoutes);

export default router;