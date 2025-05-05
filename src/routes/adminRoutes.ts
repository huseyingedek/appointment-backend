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

// Tüm işletmeleri listeleme
router.get('/accounts',
  authenticate,
  authorizeRole([UserRole.ADMIN]),
  adminController.getAllAccounts.bind(adminController)
);

// İşletme detayını görüntüleme
router.get('/accounts/:id',
  authenticate,
  authorizeRole([UserRole.ADMIN]),
  adminController.getAccountById.bind(adminController)
);

// İşletme bilgilerini güncelleme
router.put('/accounts/:id',
  authenticate,
  authorizeRole([UserRole.ADMIN]),
  adminController.updateAccount.bind(adminController)
);

// İşletmeyi pasife alma
router.patch('/accounts/:id/deactivate',
  authenticate,
  authorizeRole([UserRole.ADMIN]),
  adminController.deactivateAccount.bind(adminController)
);

// İşletmeyi silme (tamamen)
router.delete('/accounts/:id',
  authenticate,
  authorizeRole([UserRole.ADMIN]),
  adminController.deleteAccount.bind(adminController)
);

export default router;
