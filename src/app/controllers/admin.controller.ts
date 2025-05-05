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

  // Tüm işletmeleri listeleme
  async getAllAccounts(req: Request, res: Response): Promise<void> {
    try {
      // Yetki kontrolü
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için admin yetkisi gerekiyor' 
        });
        return;
      }

      const accounts = await userService.getAllAccounts();
      
      res.status(200).json({
        success: true,
        accounts
      });
    } catch (error) {
      console.error('Get accounts error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'İşletmeler listelenirken bir hata oluştu' 
      });
    }
  }

  // İşletme detayını görüntüleme
  async getAccountById(req: Request, res: Response): Promise<void> {
    try {
      // Yetki kontrolü
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için admin yetkisi gerekiyor' 
        });
        return;
      }

      const accountId = parseInt(req.params.id, 10);
      if (isNaN(accountId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Geçersiz işletme ID' 
        });
        return;
      }

      const account = await userService.getAccountById(accountId);
      
      if (!account) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bulunamadı' 
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        account
      });
    } catch (error) {
      console.error('Get account error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'İşletme bilgileri alınırken bir hata oluştu' 
      });
    }
  }

  // İşletme bilgilerini güncelleme
  async updateAccount(req: Request, res: Response): Promise<void> {
    try {
      // Yetki kontrolü
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için admin yetkisi gerekiyor' 
        });
        return;
      }

      const accountId = parseInt(req.params.id, 10);
      if (isNaN(accountId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Geçersiz işletme ID' 
        });
        return;
      }

      // İşletmenin var olup olmadığını kontrol et
      const existingAccount = await userService.getAccountById(accountId);
      if (!existingAccount) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bulunamadı' 
        });
        return;
      }

      // Güncellenecek verileri alıp doğrula
      const updateData: {
        businessName?: string;
        contactPerson?: string;
        email?: string;
        phone?: string;
        subscriptionPlan?: string;
        isActive?: boolean;
      } = {
        businessName: req.body.businessName,
        contactPerson: req.body.contactPerson,
        email: req.body.email,
        phone: req.body.phone,
        subscriptionPlan: req.body.subscriptionPlan,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : undefined
      };

      // Boş alanları kaldır
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      // İşletmeyi güncelle
      const updatedAccount = await userService.updateAccount(accountId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'İşletme bilgileri başarıyla güncellendi',
        account: updatedAccount
      });
    } catch (error) {
      console.error('Update account error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'İşletme bilgileri güncellenirken bir hata oluştu' 
      });
    }
  }

  // İşletmeyi pasife alma
  async deactivateAccount(req: Request, res: Response): Promise<void> {
    try {
      // Yetki kontrolü
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için admin yetkisi gerekiyor' 
        });
        return;
      }

      const accountId = parseInt(req.params.id, 10);
      if (isNaN(accountId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Geçersiz işletme ID' 
        });
        return;
      }

      // İşletmenin var olup olmadığını kontrol et
      const existingAccount = await userService.getAccountById(accountId);
      if (!existingAccount) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bulunamadı' 
        });
        return;
      }

      // İşletmeyi pasife al
      const deactivatedAccount = await userService.deactivateAccount(accountId);
      
      res.status(200).json({
        success: true,
        message: 'İşletme başarıyla pasif duruma alındı',
        account: deactivatedAccount
      });
    } catch (error) {
      console.error('Deactivate account error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'İşletme pasife alınırken bir hata oluştu' 
      });
    }
  }
  
  // İşletmeyi tamamen silme (Dikkatli kullanılmalı)
  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      // Yetki kontrolü
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için admin yetkisi gerekiyor' 
        });
        return;
      }

      const accountId = parseInt(req.params.id, 10);
      if (isNaN(accountId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Geçersiz işletme ID' 
        });
        return;
      }

      // İşletmenin var olup olmadığını kontrol et
      const existingAccount = await userService.getAccountById(accountId);
      if (!existingAccount) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bulunamadı' 
        });
        return;
      }
      
      // Silme işlemi için onay kontrolü (örnek)
      const confirmDelete = req.body.confirmDelete;
      if (!confirmDelete) {
        res.status(400).json({
          success: false,
          message: 'İşletmeyi silmek için onay gerekiyor. Lütfen confirmDelete=true gönderin.'
        });
        return;
      }

      // İşletmeyi tamamen sil
      await userService.deleteAccount(accountId);
      
      res.status(200).json({
        success: true,
        message: 'İşletme ve ilişkili tüm veriler başarıyla silindi'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'İşletme silinirken bir hata oluştu' 
      });
    }
  }
}