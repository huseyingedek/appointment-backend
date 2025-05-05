import express from 'express';
import { OwnerController } from '../app/controllers/owner.controller';
import { authenticate, authorizeRole } from '../app/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import ValidationMiddleware from '../app/middleware/validation.middleware';

const router = express.Router();
const ownerController = new OwnerController();

router.post('/employees',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateEmployeeCreation,
  ValidationMiddleware.validate,
  ownerController.createEmployee.bind(ownerController)
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




export default router;