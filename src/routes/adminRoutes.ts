// src/routes/adminRoutes.ts
import express from 'express';
import { AdminController } from '../app/controllers/admin.controller';
import { authenticate, authorizeRole } from '../app/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import ValidationMiddleware from '../app/middleware/validation.middleware';

const router = express.Router();
const adminController = new AdminController();

// Owner oluşturma route (sadece ADMIN erişebilir)
router.post('/owners',
  authenticate,
  authorizeRole([UserRole.ADMIN]),
  ValidationMiddleware.validateOwnerCreation,
  ValidationMiddleware.validate,
  adminController.createOwner.bind(adminController)
);

export default router;
