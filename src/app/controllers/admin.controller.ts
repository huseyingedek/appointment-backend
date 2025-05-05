// src/controllers/adminController.ts
import { Request, Response } from 'express';
import { UserService, CreateOwnerInput } from '../services/user.service';
import { validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';

const userService = new UserService();

export class AdminController {
  // Admin tarafından Owner hesabı oluşturma
  async createOwner(req: Request, res: Response): Promise<void> {
    try {
      // Yetki kontrolü
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekiyor' });
        return;
      }
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const ownerData: CreateOwnerInput = req.body;
      
      // Email kullanılıyor mu kontrol et
      const existingUser = await userService.findUserByEmail(ownerData.email);
      if (existingUser) {
        res.status(400).json({ message: 'Bu email adresi zaten kullanılıyor' });
        return;
      }
      
      const newOwner = await userService.createOwnerWithAccount(ownerData);
      
      res.status(201).json({
        success: true,
        message: 'İşletme sahibi başarıyla oluşturuldu',
        owner: {
          id: newOwner.id,
          username: newOwner.username,
          email: newOwner.email,
          role: newOwner.role
        }
      });
    } catch (error) {
      console.error('Create owner error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'İşletme sahibi oluşturulurken bir hata oluştu' 
        });
      }
    }
  }
}