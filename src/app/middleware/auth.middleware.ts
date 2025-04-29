import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { AppError } from '../utils/error.util';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export class AuthMiddleware {
  public static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new AppError(401, 'Yetkilendirme gerekli');
      }

      const jwtSecret = process.env.JWT_SECRET || 'randevu-sistemi-secret-key';
      
      const decoded = jwt.verify(token, jwtSecret) as { userId: number };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          phone: true,
          role: true
        }
      });

      if (!user) {
        throw new AppError(401, 'Kullanıcı bulunamadı');
      }

      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        next(new AppError(401, 'Geçersiz token'));
      } else {
        next(error);
      }
    }
  }

  public static authorizeAdmin(req: Request, res: Response, next: NextFunction): void {
    try {
      if (!req.user) {
        throw new AppError(401, 'Yetkilendirme gerekli');
      }

      if (req.user.role !== 'ADMIN') {
        throw new AppError(403, 'Bu işlem için admin yetkisi gerekli');
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}

export default AuthMiddleware; 