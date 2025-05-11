import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { UserRole, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Yetkilendirme başarısız: Token bulunamadı' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = verifyToken(token);
    
    req.user = decodedToken;

    // OWNER veya EMPLOYEE rolündeki kullanıcılar için işletme durumunu kontrol et
    if (req.user.role === UserRole.OWNER || req.user.role === UserRole.EMPLOYEE) {
      if (req.user.accountId) {
        const account = await prisma.accounts.findUnique({
          where: { id: req.user.accountId }
        });

        if (!account) {
          res.status(404).json({ 
            success: false,
            message: 'İşletme kaydı bulunamadı'
          });
          return;
        }

        if (!account.isActive) {
          res.status(403).json({ 
            success: false,
            message: 'İşletmeniz geçici olarak kapatılmıştır. Lütfen yetkililerle iletişime geçin.'
          });
          return;
        }
      }
    }

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