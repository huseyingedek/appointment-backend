import { Router, Request, Response, NextFunction } from 'express';
import authController from '../app/controllers/auth.controller';
import ValidationMiddleware from '../app/middleware/validation.middleware';

const router = Router();

router.post(
    '/register',
    ValidationMiddleware.validateRegister,
    ValidationMiddleware.validate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await authController.register(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/login',
    ValidationMiddleware.validateLogin,
    ValidationMiddleware.validate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await authController.login(req, res);
        } catch (error) {
            next(error);
        }
    }
);

export default router;