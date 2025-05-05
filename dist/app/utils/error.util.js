"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
        return;
    }
    console.error('Beklenmeyen hata:', err);
    res.status(500).json({
        success: false,
        message: 'Bir şeyler ters gitti. Lütfen daha sonra tekrar deneyiniz.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};
exports.errorHandler = errorHandler;
