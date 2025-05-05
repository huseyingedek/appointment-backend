// src/utils/jwt.ts
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

// Kullanıcı tipi tanımlama
interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  phone?: string | null;
  role: UserRole;
  accountId?: number | null;
}

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-değiştir';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface TokenPayload {
  userId: number;
  role: UserRole;
  accountId?: number;
}

export const generateToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    role: user.role,
    accountId: user.accountId || undefined
  };

  // @ts-ignore
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    // @ts-ignore
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Geçersiz veya süresi dolmuş token');
  }
};