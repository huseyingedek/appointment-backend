// src/controllers/authController.ts
import { Request, Response } from 'express';
import { UserService, LoginInput } from '../services/user.service';
import { generateToken } from '../utils/jwt';
import { validationResult } from 'express-validator';

const userService = new UserService();

export class AuthController {
  // Kullanıcı giriş işlemi
  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const loginData: LoginInput = req.body;
      const user = await userService.validateUser(loginData);
      
      if (!user) {
        res.status(401).json({ message: 'Geçersiz email veya şifre' });
        return;
      }
      
      // Token oluştur
      const token = generateToken(user);
      
      res.status(200).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          accountId: user.accountId
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  }

  // Mevcut kullanıcı bilgilerini getirme
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ message: 'Yetkilendirme başarısız' });
        return;
      }
      
      const user = await userService.findUserById(req.user.userId);
      
      if (!user) {
        res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return;
      }
      
      res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          // @ts-ignore - User modelinde accountId özelliği var
          accountId: user.accountId
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  }
}