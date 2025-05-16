import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { validationResult } from 'express-validator';
import { UserRole, PrismaClient } from '@prisma/client';

const userService = new UserService();
const prisma = new PrismaClient();

// WorkingHours tipi
interface WorkingHour {
  id: number;
  staffId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
}

// Çalışma saatlerini getirmek için yardımcı fonksiyon
const getWorkingHoursForStaff = async (staffId: number): Promise<WorkingHour[]> => {
  try {
    return await prisma.workingHours.findMany({
      where: { staffId },
      orderBy: { dayOfWeek: 'asc' }
    });
  } catch (error) {
    console.error(`WorkingHours fetch error for staffId ${staffId}:`, error);
    return [];
  }
};

export class EmployeeController {
  // İşletmeye ait tüm personelleri listeleme
  async getAllEmployees(req: Request, res: Response): Promise<void> {
    try {
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
      
      const staffRecords = await prisma.staff.findMany({
        where: { 
          accountId,
          isActive: true
        },
        orderBy: {
          fullName: 'asc' 
        }
      });
      
      const weekDays = [
        'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
      ];
      
      // Her personel için çalışma saatlerini manuel olarak al
      const staffWithWorkingHours = await Promise.all(
        staffRecords.map(async (staff) => {
          const workingHours = await getWorkingHoursForStaff(staff.id);
          return {
            ...staff,
            workingHours
          };
        })
      );
      
      const extendedEmployees = employees.map(emp => {
        const staffRecord = staffWithWorkingHours.find(s => s.email === emp.email);
        
        if (staffRecord && staffRecord.workingHours) {
          const formattedHours = staffRecord.workingHours.map(wh => ({
            ...wh,
            dayName: weekDays[wh.dayOfWeek]
          }));
          
          return {
            ...emp,
            workingHours: formattedHours,
            staffId: staffRecord.id
          };
        }
        
        return { ...emp, workingHours: [], staffId: null };
      });
      
      res.status(200).json({
        success: true,
        employees: extendedEmployees
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
      
      // Personelin staff kaydını bul
      const staffRecord = await prisma.staff.findFirst({
        where: { 
          email: employee.email,
          accountId
        }
      });
      
      // Çalışma saatlerini ayrıca getir
      let workingHours: (WorkingHour & { dayName?: string })[] = [];
      if (staffRecord) {
        workingHours = await getWorkingHoursForStaff(staffRecord.id);
        
        // Çalışma saatlerini formatla
        const weekDays = [
          'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
        ];
        
        workingHours = workingHours.map(wh => ({
          ...wh,
          dayName: weekDays[wh.dayOfWeek]
        }));
      }

      // Personel bilgilerine çalışma saatlerini ekle
      const extendedEmployee = {
        ...employee,
        workingHours: workingHours || [],
        staffId: staffRecord?.id
      };
      
      res.status(200).json({
        success: true,
        employee: extendedEmployee
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

      // İstek gövdesinden bilgileri al
      const { username, email, phone, password, fullName, workingHours } = req.body;
      
      // Çalışma saatlerini doğrulama
      if (workingHours && Array.isArray(workingHours)) {
        for (const wh of workingHours) {
          if (wh.dayOfWeek < 0 || wh.dayOfWeek > 6) {
            res.status(400).json({
              success: false,
              message: 'Geçersiz gün değeri. 0 (Pazar) ile 6 (Cumartesi) arasında olmalıdır.'
            });
            return;
          }
          
          if (!wh.startTime || !wh.endTime) {
            res.status(400).json({
              success: false,
              message: 'Başlangıç ve bitiş saati gereklidir (örn: "09:00")'
            });
            return;
          }
        }
      }
      
      // Güncellenecek verileri hazırla
      const updateData: {
        username?: string;
        email?: string;
        phone?: string;
        password?: string;
        fullName?: string;
        workingHours?: any[];
      } = {};
      
      // Sadece değer verilmiş alanları ekle
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (password !== undefined) updateData.password = password;
      if (fullName !== undefined) updateData.fullName = fullName;
      if (workingHours !== undefined) updateData.workingHours = workingHours;

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
      
      // Güncel personel bilgilerini getir (çalışma saatleriyle birlikte)
      // @ts-ignore
      const staffRecord = await prisma.staff.findFirst({
        where: { 
          email: updatedEmployee.email,
          accountId
        },
        include: {
          // @ts-ignore - Prisma tip hatalarını geçici olarak yok sayıyoruz
          workingHours: {
            orderBy: {
              dayOfWeek: 'asc'
            }
          }
        }
      });
      
      res.status(200).json({
        success: true,
        message: 'Personel bilgileri başarıyla güncellendi',
        employee: {
          ...updatedEmployee,
          staff: staffRecord
        }
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