import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Yetkilendirme başarısız: Token bulunamadı' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = verifyToken(token);
    
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Yetkilendirme başarısız: Geçersiz token' });
    return;
  }
};

export const authorizeRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({ message: 'Bu işlem için yetkiniz bulunmamaktadır' });
      return;
    }

    next();
  };
};