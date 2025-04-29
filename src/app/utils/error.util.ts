import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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