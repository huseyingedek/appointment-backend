import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';

export class ValidationMiddleware {
    public static validateRegister: ValidationChain[] = [
        body('username')
            .trim()
            .notEmpty()
            .withMessage('Kullanıcı adı zorunludur')
            .isLength({ min: 3 })
            .withMessage('Kullanıcı adı en az 3 karakter olmalıdır'),

        body('email')
            .trim()
            .notEmpty()
            .withMessage('Email zorunludur')
            .isEmail()
            .withMessage('Geçerli bir email adresi giriniz')
            .normalizeEmail(),

        body('password')
            .trim()
            .notEmpty()
            .withMessage('Şifre zorunludur')
            .isLength({ min: 8 })
            .withMessage('Şifre en az 8 karakter olmalıdır'),
            
        body('phone')
            .optional()
            .trim()
            .isLength({ min: 10 })
            .withMessage('Telefon numarası en az 10 karakter olmalıdır'),
            
        body('role')
            .optional()
            .isIn(['USER', 'ADMIN'])
            .withMessage('Geçerli bir rol değeri giriniz (USER, ADMIN)')
    ];

    public static validateLogin: ValidationChain[] = [
        body('email')
            .trim()
            .notEmpty()
            .withMessage('Email zorunludur')
            .isEmail()
            .withMessage('Geçerli bir email adresi giriniz')
            .normalizeEmail(),

        body('password')
            .trim()
            .notEmpty()
            .withMessage('Şifre zorunludur')
    ];

    public static validate = (req: Request, res: Response, next: NextFunction): void => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                message: 'Validasyon hatası',
                errors: errors.array().map(err => ({
                    field: err.type === 'field' ? err.path : '',
                    message: err.msg
                }))
            });
            return;
        }
        next();
    };
}

export default ValidationMiddleware; 