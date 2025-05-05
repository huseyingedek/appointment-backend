import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { AppError } from '../utils/error.util';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'randevu-sistemi-secret-key';

class AuthService {
  public static async register(data: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    role?: UserRole;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      throw new AppError(400, 'Bu e-posta adresi zaten kullanımda');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        phone: data.phone || '',
        // @ts-ignore
        role: data.role || UserRole.EMPLOYEE
      },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        role: true
      }
    });

    return user;
  }

  public static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new AppError(401, 'Kullanıcı bulunamadı');
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      throw new AppError(401, 'Şifre yanlış');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return token;
  }
}

export default AuthService;
