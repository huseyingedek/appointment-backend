import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';

const userService = new UserService();

export class EmployeeController {
  // İşletmeye ait tüm personelleri listeleme
  async getAllEmployees(req: Request, res: Response): Promise<void> {
    try {
      // Yetki kontrolü
      if (!req.user || req.user.role !== UserRole.OWNER) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için işletme sahibi yetkisi gerekiyor' 
        });
        return;
      }

      const accountId = req.user.accountId;
      if (!accountId) {
        res.status(400).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }

      const employees = await userService.getEmployeesByAccountId(accountId);
      
      res.status(200).json({
        success: true,
        employees
      });
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Personeller listelenirken bir hata oluştu' 
      });
    }
  }

  // Personel detayını görüntüleme
  async getEmployeeById(req: Request, res: Response): Promise<void> {
    try {
      // Yetki kontrolü
      if (!req.user || req.user.role !== UserRole.OWNER) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için işletme sahibi yetkisi gerekiyor' 
        });
        return;
      }

      const accountId = req.user.accountId;
      if (!accountId) {
        res.status(400).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }

      const employeeId = parseInt(req.params.id, 10);
      if (isNaN(employeeId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Geçersiz personel ID' 
        });
        return;
      }

      const employee = await userService.getEmployeeById(employeeId, accountId);
      
      if (!employee) {
        res.status(404).json({ 
          success: false, 
          message: 'Personel bulunamadı' 
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        employee
      });
    } catch (error) {
      console.error('Get employee error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Personel bilgileri alınırken bir hata oluştu' 
      });
    }
  }

  // Personel oluşturma (Bu işlev zaten UserService'de var, buraya owner tarafından kullanılmak üzere ekleyelim)
  async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      // Yetki kontrolü
      if (!req.user || req.user.role !== UserRole.OWNER) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için işletme sahibi yetkisi gerekiyor' 
        });
        return;
      }

      const accountId = req.user.accountId;
      if (!accountId) {
        res.status(400).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      // Email kullanılıyor mu kontrol et
      const existingUser = await userService.findUserByEmail(req.body.email);
      if (existingUser) {
        res.status(400).json({ 
          success: false, 
          message: 'Bu email adresi zaten kullanılıyor' 
        });
        return;
      }

      const employeeData = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        phone: req.body.phone,
        role: UserRole.EMPLOYEE,
        accountId: accountId
      };

      const newEmployee = await userService.createEmployee(employeeData, accountId);
      
      res.status(201).json({
        success: true,
        message: 'Personel başarıyla oluşturuldu',
        employee: {
          id: newEmployee.user.id,
          username: newEmployee.user.username,
          email: newEmployee.user.email,
          phone: newEmployee.user.phone,
          role: newEmployee.user.role
        },
        staffId: newEmployee.staffId
      });
    } catch (error) {
      console.error('Create employee error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Personel oluşturulurken bir hata oluştu' 
        });
      }
    }
  }

  // Personel bilgilerini güncelleme
  async updateEmployee(req: Request, res: Response): Promise<void> {
    try {
      // Yetki kontrolü
      if (!req.user || req.user.role !== UserRole.OWNER) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için işletme sahibi yetkisi gerekiyor' 
        });
        return;
      }

      const accountId = req.user.accountId;
      if (!accountId) {
        res.status(400).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }

      const employeeId = parseInt(req.params.id, 10);
      if (isNaN(employeeId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Geçersiz personel ID' 
        });
        return;
      }

      // Güncellenecek verileri alıp doğrula
      const updateData: {
        username?: string;
        email?: string;
        phone?: string;
        password?: string;
      } = {
        username: req.body.username,
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password
      };

      // Boş alanları kaldır
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      // Eğer email değişiyorsa, email kullanılıyor mu kontrol et
      if (updateData.email) {
        const existingUser = await userService.findUserByEmail(updateData.email);
        if (existingUser && existingUser.id !== employeeId) {
          res.status(400).json({ 
            success: false, 
            message: 'Bu email adresi zaten kullanılıyor' 
          });
          return;
        }
      }

      // Personeli güncelle
      const updatedEmployee = await userService.updateEmployee(employeeId, accountId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Personel bilgileri başarıyla güncellendi',
        employee: updatedEmployee
      });
    } catch (error) {
      console.error('Update employee error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Personel güncellenirken bir hata oluştu' 
        });
      }
    }
  }

  // Personel silme
  async deleteEmployee(req: Request, res: Response): Promise<void> {
    try {
      // Yetki kontrolü
      if (!req.user || req.user.role !== UserRole.OWNER) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu işlem için işletme sahibi yetkisi gerekiyor' 
        });
        return;
      }

      const accountId = req.user.accountId;
      if (!accountId) {
        res.status(400).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }

      const employeeId = parseInt(req.params.id, 10);
      if (isNaN(employeeId)) {
        res.status(400).json({ 
          success: false, 
          message: 'Geçersiz personel ID' 
        });
        return;
      }

      // Personeli sil
      await userService.deleteEmployee(employeeId, accountId);
      
      res.status(200).json({
        success: true,
        message: 'Personel başarıyla silindi'
      });
    } catch (error) {
      console.error('Delete employee error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Personel silinirken bir hata oluştu' 
        });
      }
    }
  }
} 