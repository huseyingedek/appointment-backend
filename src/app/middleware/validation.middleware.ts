import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { UserRole } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

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
            .isIn(Object.values(UserRole))
            .withMessage('Geçerli bir rol değeri giriniz')
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

    public static validateOwnerCreation: ValidationChain[] = [
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
        
        body('businessName')
            .trim()
            .notEmpty()
            .withMessage('İşletme adı zorunludur'),
        
        body('phone')
            .optional()
            .trim()
            .isLength({ min: 10 })
            .withMessage('Telefon numarası en az 10 karakter olmalıdır'),
        
        body('businessEmail')
            .optional()
            .isEmail()
            .withMessage('Geçerli bir işletme email adresi giriniz'),
        
        body('businessPhone')
            .optional()
            .trim()
            .isLength({ min: 10 })
            .withMessage('İşletme telefon numarası en az 10 karakter olmalıdır'),
        
        body('subscriptionPlan')
            .optional()
            .isIn(['Basic', 'Standard', 'Premium'])
            .withMessage('Geçerli bir abonelik planı giriniz (Basic, Standard, Premium)')
    ];

    public static validateEmployeeCreation: ValidationChain[] = [
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

        body('phone')
            .optional()
            .trim()
            .isLength({ min: 10 })
            .withMessage('Telefon numarası en az 10 karakter olmalıdır'),
        
    ];

    public static validateEmployeeUpdate: ValidationChain[] = [
        body('username')
            .optional()
            .trim()
            .isLength({ min: 3 })
            .withMessage('Kullanıcı adı en az 3 karakter olmalıdır'),

        body('email')
            .optional()
            .trim()
            .isEmail()
            .withMessage('Geçerli bir email adresi giriniz')
            .normalizeEmail(),

        
        body('phone')
            .optional()
            .trim()
            .isLength({ min: 10 })
            .withMessage('Telefon numarası en az 10 karakter olmalıdır')
    ];

    public static validateServiceCreation: ValidationChain[] = [
        body('serviceName')
            .trim()
            .notEmpty()
            .withMessage('Hizmet adı zorunludur'),
        
        body('price')
            .notEmpty()
            .withMessage('Fiyat zorunludur')
            .isNumeric()
            .withMessage('Fiyat sayısal bir değer olmalıdır'),
        
        body('durationMinutes')
            .optional()
            .isInt({ min: 5 })
            .withMessage('Süre en az 5 dakika olmalıdır'),
        
        body('description')
            .optional()
            .trim(),
        
        body('sessionCount')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Seans sayısı en az 1 olmalıdır')
    ];

    public static validateServiceUpdate: ValidationChain[] = [
        body('accountId')
            .not()
            .exists()
            .withMessage('Account ID değiştirilemez'),
        
        body('serviceName')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Hizmet adı boş olamaz'),
        
        body('price')
            .optional()
            .isNumeric()
            .withMessage('Fiyat sayısal bir değer olmalıdır'),
        
        body('durationMinutes')
            .optional()
            .isInt({ min: 5 })
            .withMessage('Süre en az 5 dakika olmalıdır'),
        
        body('description')
            .optional()
            .trim(),
        
        body('sessionCount')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Seans sayısı en az 1 olmalıdır')
    ];

    public static validateClientCreation: ValidationChain[] = [
        body('firstName')
            .trim()
            .notEmpty()
            .withMessage('Ad zorunludur'),
        
        body('lastName')
            .trim()
            .notEmpty()
            .withMessage('Soyad zorunludur'),
        
        body('phone')
            .optional()
            .trim()
            .isLength({ min: 10 })
            .withMessage('Telefon numarası en az 10 karakter olmalıdır'),
        
        body('email')
            .optional()
            .trim()
            .isEmail()
            .withMessage('Geçerli bir email adresi giriniz')
            .normalizeEmail()
    ];

    public static validateClientUpdate: ValidationChain[] = [
        body('firstName')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Ad boş olamaz'),
        
        body('lastName')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Soyad boş olamaz'),
        
        body('phone')
            .optional()
            .trim()
            .isLength({ min: 10 })
            .withMessage('Telefon numarası en az 10 karakter olmalıdır'),
        
        body('email')
            .optional()
            .trim()
            .isEmail()
            .withMessage('Geçerli bir email adresi giriniz')
            .normalizeEmail()
    ];

    public static validateAppointmentCreation: ValidationChain[] = [
        body('customerName')
            .trim()
            .notEmpty()
            .withMessage('Müşteri adı zorunludur'),
        
        body('serviceId')
            .notEmpty()
            .withMessage('Hizmet seçimi zorunludur')
            .isInt({ min: 1 })
            .withMessage('Geçerli bir hizmet ID giriniz'),
        
        body('appointmentDate')
            .notEmpty()
            .withMessage('Randevu tarihi zorunludur')
            .isISO8601()
            .withMessage('Geçerli bir tarih-saat formatı giriniz (ISO8601)')
            .custom((value) => {
                const date = new Date(value);
                const now = new Date();
                if (date < now) {
                    throw new Error('Randevu tarihi geçmiş bir tarih olamaz');
                }
                return true;
            }),
        
        body('notes')
            .optional()
            .trim()
    ];

    public static validateSaleCreation: ValidationChain[] = [
        body('clientId')
            .notEmpty()
            .withMessage('Müşteri ID zorunludur')
            .isInt({ min: 1 })
            .withMessage('Geçerli bir müşteri ID giriniz'),
        
        body('serviceId')
            .notEmpty()
            .withMessage('Hizmet ID zorunludur')
            .isInt({ min: 1 })
            .withMessage('Geçerli bir hizmet ID giriniz'),
        
        body('remainingSessions')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Kalan seans sayısı negatif olamaz')
    ];

    public static validatePaymentCreation: ValidationChain[] = [
        body('saleId')
            .notEmpty()
            .withMessage('Satış ID zorunludur')
            .isInt({ min: 1 })
            .withMessage('Geçerli bir satış ID giriniz'),
        
        body('amountPaid')
            .notEmpty()
            .withMessage('Ödeme tutarı zorunludur')
            .isNumeric()
            .withMessage('Ödeme tutarı sayısal bir değer olmalıdır'),
        
        body('paymentMethod')
            .notEmpty()
            .withMessage('Ödeme yöntemi zorunludur')
            .isIn(['Cash', 'CreditCard', 'Transfer', 'Other'])
            .withMessage('Geçerli bir ödeme yöntemi giriniz (Cash, CreditCard, Transfer, Other)'),
        
        body('notes')
            .optional()
            .trim()
    ];

    public static validateAppointmentUpdate: ValidationChain[] = [
        body('customerName')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Müşteri adı boş olamaz'),
        
        body('serviceId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Geçerli bir hizmet ID giriniz'),
        
        body('appointmentDate')
            .optional()
            .isISO8601()
            .withMessage('Geçerli bir tarih-saat formatı giriniz (ISO8601)')
            .custom((value) => {
                const date = new Date(value);
                const now = new Date();
                if (date < now) {
                    throw new Error('Randevu tarihi geçmiş bir tarih olamaz');
                }
                return true;
            }),
        
        body('status')
            .optional()
            .isIn(['Planned', 'Completed', 'Cancelled'])
            .withMessage('Geçerli bir randevu durumu giriniz (Planned, Completed, Cancelled)'),
        
        body('notes')
            .optional()
            .trim()
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
        } else {
            next();
        }
    };
}

export default ValidationMiddleware; 