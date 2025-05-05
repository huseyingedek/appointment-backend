"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationMiddleware = void 0;
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
class ValidationMiddleware {
}
exports.ValidationMiddleware = ValidationMiddleware;
ValidationMiddleware.validateRegister = [
    (0, express_validator_1.body)('username')
        .trim()
        .notEmpty()
        .withMessage('Kullanıcı adı zorunludur')
        .isLength({ min: 3 })
        .withMessage('Kullanıcı adı en az 3 karakter olmalıdır'),
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email zorunludur')
        .isEmail()
        .withMessage('Geçerli bir email adresi giriniz')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .trim()
        .notEmpty()
        .withMessage('Şifre zorunludur')
        .isLength({ min: 8 })
        .withMessage('Şifre en az 8 karakter olmalıdır'),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .isLength({ min: 10 })
        .withMessage('Telefon numarası en az 10 karakter olmalıdır'),
    (0, express_validator_1.body)('role')
        .optional()
        .isIn(Object.values(client_1.UserRole))
        .withMessage('Geçerli bir rol değeri giriniz')
];
ValidationMiddleware.validateLogin = [
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email zorunludur')
        .isEmail()
        .withMessage('Geçerli bir email adresi giriniz')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .trim()
        .notEmpty()
        .withMessage('Şifre zorunludur')
];
ValidationMiddleware.validateOwnerCreation = [
    (0, express_validator_1.body)('username')
        .trim()
        .notEmpty()
        .withMessage('Kullanıcı adı zorunludur')
        .isLength({ min: 3 })
        .withMessage('Kullanıcı adı en az 3 karakter olmalıdır'),
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email zorunludur')
        .isEmail()
        .withMessage('Geçerli bir email adresi giriniz')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .trim()
        .notEmpty()
        .withMessage('Şifre zorunludur')
        .isLength({ min: 8 })
        .withMessage('Şifre en az 8 karakter olmalıdır'),
    (0, express_validator_1.body)('businessName')
        .trim()
        .notEmpty()
        .withMessage('İşletme adı zorunludur'),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .isLength({ min: 10 })
        .withMessage('Telefon numarası en az 10 karakter olmalıdır'),
    (0, express_validator_1.body)('businessEmail')
        .optional()
        .isEmail()
        .withMessage('Geçerli bir işletme email adresi giriniz'),
    (0, express_validator_1.body)('businessPhone')
        .optional()
        .trim()
        .isLength({ min: 10 })
        .withMessage('İşletme telefon numarası en az 10 karakter olmalıdır'),
    (0, express_validator_1.body)('subscriptionPlan')
        .optional()
        .isIn(['Basic', 'Standard', 'Premium'])
        .withMessage('Geçerli bir abonelik planı giriniz (Basic, Standard, Premium)')
];
ValidationMiddleware.validateEmployeeCreation = [
    (0, express_validator_1.body)('username')
        .trim()
        .notEmpty()
        .withMessage('Kullanıcı adı zorunludur')
        .isLength({ min: 3 })
        .withMessage('Kullanıcı adı en az 3 karakter olmalıdır'),
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email zorunludur')
        .isEmail()
        .withMessage('Geçerli bir email adresi giriniz')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .trim()
        .notEmpty()
        .withMessage('Şifre zorunludur')
        .isLength({ min: 8 })
        .withMessage('Şifre en az 8 karakter olmalıdır'),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .isLength({ min: 10 })
        .withMessage('Telefon numarası en az 10 karakter olmalıdır'),
    (0, express_validator_1.body)('accountId')
        .notEmpty()
        .withMessage('Account ID zorunludur')
        .isNumeric()
        .withMessage('Account ID sayısal bir değer olmalıdır')
];
ValidationMiddleware.validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: 'Validasyon hatası',
            errors: errors.array().map(err => ({
                field: err.type === 'field' ? err.path : '',
                message: err.msg
            }))
        });
    }
    else {
        next();
    }
};
exports.default = ValidationMiddleware;
