import express from 'express';
import { EmployeeController } from '../app/controllers/employee.controller';
import { authenticate, authorizeRole } from '../app/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import ValidationMiddleware from '../app/middleware/validation.middleware';

const router = express.Router();
const employeeController = new EmployeeController();

router.get('/',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  employeeController.getAllEmployees.bind(employeeController)
);

router.get('/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  employeeController.getEmployeeById.bind(employeeController)
);

router.post('/',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateEmployeeCreation,
  ValidationMiddleware.validate,
  employeeController.createEmployee.bind(employeeController)
);

router.put('/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  ValidationMiddleware.validateEmployeeUpdate,
  ValidationMiddleware.validate,
  employeeController.updateEmployee.bind(employeeController)
);

router.delete('/:id',
  authenticate,
  authorizeRole([UserRole.OWNER]),
  employeeController.deleteEmployee.bind(employeeController)
);

export default router; 