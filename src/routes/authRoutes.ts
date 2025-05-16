import express from 'express';
import { AuthController } from '../app/controllers/auth.controller';
import { authenticate } from '../app/middleware/auth.middleware';
import ValidationMiddleware from '../app/middleware/validation.middleware';

const router = express.Router();
const authController = new AuthController();

router.post('/login',
  ValidationMiddleware.validateLogin,
  ValidationMiddleware.validate,
  authController.login.bind(authController)
);

router.get('/me', authenticate, authController.getCurrentUser.bind(authController));

export default router;