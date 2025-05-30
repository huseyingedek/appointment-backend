import express from 'express';
import { OwnerController } from '../app/controllers/owner.controller';
import { authenticate, authorizeRole } from '../app/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import ValidationMiddleware from '../app/middleware/validation.middleware';

const router = express.Router();
const ownerController = new OwnerController();

router.get('/employees',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getEmployees.bind(ownerController)
);

router.post('/employees',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateEmployeeCreation,
  ValidationMiddleware.validate,
  ownerController.createEmployee.bind(ownerController)
);

// Personel detaylarını getir
router.get('/employees/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getEmployeeDetails.bind(ownerController)
);

// Personel güncelleme endpoint'i
router.put('/employees/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateEmployeeUpdate,
  ValidationMiddleware.validate,
  ownerController.updateEmployee.bind(ownerController)
);

// Çalışma saatleri düzenleme endpoint'i zaten var
router.put('/employees/:staffId/working-hours',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.setEmployeeWorkingHours.bind(ownerController)
);

router.post('/services',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateServiceCreation,
  ValidationMiddleware.validate,
  ownerController.createService.bind(ownerController)
);

router.get('/services',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getServices.bind(ownerController)
);

router.put('/services/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateServiceUpdate,
  ValidationMiddleware.validate,
  ownerController.updateService.bind(ownerController)
);

router.delete('/services/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.deleteService.bind(ownerController)
);

router.post('/clients',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateClientCreation,
  ValidationMiddleware.validate,
  ownerController.createClient.bind(ownerController)
);

router.get('/clients',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getClients.bind(ownerController)
);

router.get('/clients/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getClientById.bind(ownerController)
);

router.put('/clients/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateClientUpdate,
  ValidationMiddleware.validate,
  ownerController.updateClient.bind(ownerController)
);

router.post('/appointments',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateAppointmentCreation,
  ValidationMiddleware.validate,
  ownerController.createAppointment.bind(ownerController)
);

router.get('/appointments',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getAppointments.bind(ownerController)
);

router.get('/appointments/:date',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getAppointmentsByDate.bind(ownerController)
);

router.put('/appointments/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateAppointmentUpdate,
  ValidationMiddleware.validate,
  ownerController.updateAppointment.bind(ownerController)
);

router.delete('/appointments/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.deleteAppointment.bind(ownerController)
);

router.patch('/appointments/:id/status',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.updateAppointmentStatus.bind(ownerController)
);

// Duruma göre randevuları listeleme route'u
router.get('/appointments/status/:status',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getAppointmentsByStatus.bind(ownerController)
);

// Satış işlemleri
router.post('/sales',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateSaleCreation,
  ValidationMiddleware.validate,
  ownerController.createSale.bind(ownerController)
);

router.get('/sales',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getSales.bind(ownerController)
);

router.get('/sales/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getSaleById.bind(ownerController)
);

router.get('/clients/:id/sales',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getClientSales.bind(ownerController)
);

// Ödeme işlemleri
router.post('/payments',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validatePaymentCreation,
  ValidationMiddleware.validate,
  ownerController.createPayment.bind(ownerController)
);

router.get('/sales/:id/payments',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getSalePayments.bind(ownerController)
);

// Seans işlemleri
router.get('/clients/:id/sessions',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getClientRemainingSessions.bind(ownerController)
);

router.get('/sessions',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getAllSessions.bind(ownerController)
);

router.post('/sales/:id/use-session',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.useSession.bind(ownerController)
);

// Dashboard istatistikleri route'u
router.get('/dashboard/stats',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ownerController.getDashboardStats.bind(ownerController)
);

export default router;