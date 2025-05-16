import express from 'express';
import { Request, Response } from 'express';
import { UserService, CreateUserInput } from '../services/user.service';
import { ServiceService } from '../services/service.service';
import { ClientService } from '../services/client.service';
import { AppointmentService } from '../services/appointment.service';
import { SaleService } from '../services/sale.service';
import { DashboardService } from '../services/dashboard.service';
import { validationResult } from 'express-validator';
import { UserRole, AppointmentStatus, PaymentMethod, SessionStatus, PrismaClient } from '@prisma/client';
import { StaffService } from '../services/staff.service';

const prisma = new PrismaClient();
const userService = new UserService();
const serviceService = new ServiceService();
const clientService = new ClientService();
const appointmentService = new AppointmentService();
const saleService = new SaleService();
const dashboardService = new DashboardService();
const staffService = new StaffService();

// İlk 25 satırı korudum, yardımcı fonksiyonumuzu ekliyoruz
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
    // workingHours tablosunu kontrol et ve varsa veriyi getir
    try {
      return await prisma.workingHours.findMany({
        where: { staffId },
        orderBy: { dayOfWeek: 'asc' }
      });
    } catch (error) {
      console.error(`WorkingHours fetch error for staffId ${staffId}:`, error);
      return []; // Hata durumunda boş array dön
    }
  } catch (error) {
    console.error(`WorkingHours fetch error for staffId ${staffId}:`, error);
    return [];
  }
};

export class OwnerController {
  
  async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false, 
          message: 'Validasyon hatası',
          errors: errors.array().map((error: any) => ({
            field: error.path || error.param,
            message: error.msg
          }))
        });
        return;
      }

      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ message: 'Yetkilendirme başarısız' });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return;
      }
      
      const ownerAccountId = owner.accountId;
      if (!ownerAccountId) {
        res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
        return;
      }
      
      // İstek gövdesinden fullName ve workingHours bilgilerini al
      const { fullName, workingHours, ...userData } = req.body;
      
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
      
      // Eğer username belirtilmemişse, fullName'in ilk kelimesini kullan
      const username = userData.username || fullName.split(' ')[0];
      
      const employeeData: CreateUserInput = {
        ...userData,
        username,
        role: UserRole.EMPLOYEE,
        accountId: ownerAccountId,
        fullName,
        workingHours
      };
      
      const existingUser = await userService.findUserByEmail(employeeData.email);
      if (existingUser) {
        res.status(400).json({ 
          success: false, 
          message: 'Bu email adresi zaten kullanılıyor' 
        });
        return;
      }
      
      const employee = await userService.createEmployee(employeeData, ownerAccountId);
      
      // Personelin detaylı bilgilerini getir (çalışma saatleriyle birlikte)
      const staff = await prisma.staff.findUnique({
        where: { id: employee.staffId }
      });
      
      // Personelin çalışma saatlerini ayrıca getir
      let staffWorkingHours: WorkingHour[] = [];
      if (staff) {
        staffWorkingHours = await getWorkingHoursForStaff(staff.id);
      }
      
      // Staff ve workingHours'ı birleştir
      const staffWithDetails = {
        ...staff,
        workingHours: staffWorkingHours
      };
      
      res.status(201).json({
        success: true,
        message: 'Personel başarıyla oluşturuldu',
        employee: {
          id: employee.user.id,
          username: employee.user.username,
          email: employee.user.email,
          role: employee.user.role,
          accountId: employee.user.accountId,
          staff: staffWithDetails
        }
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

  async getEmployees(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // İşletmeye ait personelleri getir (çalışma saatleriyle birlikte)
      const staff = await prisma.staff.findMany({
        where: { 
          accountId,
          isActive: true 
        },
        orderBy: { fullName: 'asc' }
      });
      
      // Her personel için çalışma saatlerini al
      const staffWithWorkingHours = await Promise.all(
        staff.map(async (staffMember) => {
          const workingHours = await getWorkingHoursForStaff(staffMember.id);
          return {
            ...staffMember,
            workingHours
          };
        })
      );
      
      // Personelin kullanıcı hesaplarını da getir
      const staffWithUsers = await Promise.all(staffWithWorkingHours.map(async (staffMember) => {
        // Personelin email'i ile kullanıcı bilgisini bul
        const user = staffMember.email 
          ? await prisma.user.findFirst({
              where: { 
                email: staffMember.email,
                accountId: accountId 
              },
              select: {
                id: true,
                username: true,
                email: true,
                role: true,
                accountId: true
              }
            })
          : null;

        // Günleri Türkçe formatla
        const weekDays = [
          'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
        ];

        // Çalışma saatlerini formatla
        const formattedWorkingHours = staffMember.workingHours.map(wh => ({
          id: wh.id,
          dayOfWeek: wh.dayOfWeek,
          dayName: weekDays[wh.dayOfWeek],
          startTime: wh.startTime,
          endTime: wh.endTime,
          isWorking: wh.isWorking
        }));
        
        return {
          ...staffMember,
          user,
          workingHours: formattedWorkingHours
        };
      }));
      
      res.status(200).json({
        success: true,
        staff: staffWithUsers
      });
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Personel bilgileri alınırken bir hata oluştu' 
      });
    }
  }

  // Personel çalışma saatlerini ayarlama
  async setEmployeeWorkingHours(req: Request, res: Response): Promise<void> {
    try {
      const staffId = parseInt(req.params.staffId, 10);
      const { workingHours } = req.body;
      
      if (!Array.isArray(workingHours)) {
        res.status(400).json({
          success: false,
          message: 'Çalışma saatleri dizi formatında olmalıdır'
        });
        return;
      }
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Personelin bu işletmeye ait olup olmadığını kontrol et
      const staff = await prisma.staff.findUnique({
        where: { id: staffId }
      });
      
      if (!staff) {
        res.status(404).json({
          success: false,
          message: 'Personel bulunamadı'
        });
        return;
      }
      
      if (staff.accountId !== accountId) {
        res.status(403).json({
          success: false,
          message: 'Bu personel sizin işletmenize ait değil'
        });
        return;
      }
      
      // Çalışma saatlerini kontrol et
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
      
      // Mevcut çalışma saatlerini temizle
      try {
        await prisma.workingHours.deleteMany({
          where: { staffId }
        });
      } catch (error) {
        console.error('Error while deleting working hours:', error);
        res.status(500).json({
          success: false,
          message: 'Mevcut çalışma saatleri silinirken bir hata oluştu'
        });
        return;
      }
      
      // Yeni çalışma saatlerini ekle
      try {
        for (const hour of workingHours) {
          await prisma.workingHours.create({
            data: {
              staffId,
              dayOfWeek: hour.dayOfWeek,
              startTime: hour.startTime,
              endTime: hour.endTime,
              isWorking: hour.isWorking
            }
          });
        }
      } catch (error) {
        console.error('Error while creating working hours:', error);
        res.status(500).json({
          success: false,
          message: 'Çalışma saatleri eklenirken bir hata oluştu'
        });
        return;
      }
      
      // Güncellenmiş personel bilgileri için staff objesini getir
      const updatedStaff = await prisma.staff.findUnique({
        where: { id: staffId }
      });
      
      // Çalışma saatlerini ayrıca getir
      const updatedWorkingHours = await getWorkingHoursForStaff(staffId);
      
      // Türkçe gün adlarını ekle
      const weekDays = [
        'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
      ];
      
      const formattedWorkingHours = updatedWorkingHours.map(wh => ({
        ...wh,
        dayName: weekDays[wh.dayOfWeek]
      }));
      
      // Staff ve workingHours'ı birleştir
      const staffWithWorkingHours = {
        ...updatedStaff,
        workingHours: formattedWorkingHours
      };
      
      res.status(200).json({
        success: true,
        message: 'Personel çalışma saatleri başarıyla güncellendi',
        staff: staffWithWorkingHours
      });
    } catch (error) {
      console.error('Set working hours error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Çalışma saatleri güncellenirken bir hata oluştu' 
        });
      }
    }
  }

  // Personel çalışma saatlerini görüntüleme
  async getEmployeeWorkingHours(req: Request, res: Response): Promise<void> {
    try {
      const staffId = parseInt(req.params.staffId, 10);
      
      if (isNaN(staffId)) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz personel ID'
        });
        return;
      }
      
      // Personelin bu işletmeye ait olup olmadığını kontrol et
      const staff = await prisma.staff.findUnique({
        where: { id: staffId }
      });
      
      if (!staff) {
        res.status(404).json({
          success: false,
          message: 'Personel bulunamadı'
        });
        return;
      }
      
      // Owner'ın işletme ID'sini al ve yetki kontrolü yap
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner || owner.accountId !== staff.accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu personele erişim yetkiniz yok' 
        });
        return;
      }
      
      // Çalışma saatlerini getir
      const workingHours = await getWorkingHoursForStaff(staffId);
      
      // Türkçe gün adlarını ekle
      const weekDays = [
        'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
      ];
      
      const formattedWorkingHours = workingHours.map(wh => ({
        ...wh,
        dayName: weekDays[wh.dayOfWeek]
      }));
      
      res.status(200).json({
        success: true,
        workingHours: formattedWorkingHours
      });
    } catch (error) {
      console.error('Get employee working hours error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Çalışma saatleri alınırken bir hata oluştu' 
      });
    }
  }

  async createService(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ message: 'Yetkilendirme başarısız' });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
        return;
      }
      
      const serviceData = {
        ...req.body,
        accountId
      };
      
      const service = await serviceService.createService(serviceData);
      
      res.status(201).json({
        success: true,
        message: 'Hizmet başarıyla oluşturuldu',
        service
      });
    } catch (error) {
      console.error('Create service error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Hizmet oluşturulurken bir hata oluştu' 
        });
      }
    }
  }

  async getServices(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ message: 'Yetkilendirme başarısız' });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
        return;
      }
      
      // İşletmeye ait hizmetleri getir
      const services = await serviceService.getServicesByAccountId(accountId);
      
      res.status(200).json({
        success: true,
        services
      });
    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Hizmetler alınırken bir hata oluştu' 
      });
    }
  }

  // Hizmet güncelleme
  async updateService(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const serviceId = parseInt(req.params.id);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ message: 'Yetkilendirme başarısız' });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
        return;
      }
      
      // Hizmetin işletmeye ait olup olmadığını kontrol et
      const service = await serviceService.getServiceById(serviceId);
      if (!service) {
        res.status(404).json({ message: 'Hizmet bulunamadı' });
        return;
      }
      
      if (service.accountId !== accountId) {
        res.status(403).json({ message: 'Bu hizmeti güncelleme yetkiniz yok' });
        return;
      }
      
      // Hizmeti güncelle
      const updatedService = await serviceService.updateService(serviceId, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Hizmet başarıyla güncellendi',
        service: updatedService
      });
    } catch (error) {
      console.error('Update service error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Hizmet güncellenirken bir hata oluştu' 
        });
      }
    }
  }

  // Hizmet silme
  async deleteService(req: Request, res: Response): Promise<void> {
    try {
      const serviceId = parseInt(req.params.id);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ message: 'Yetkilendirme başarısız' });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
        return;
      }
      
      // Hizmetin işletmeye ait olup olmadığını kontrol et
      const service = await serviceService.getServiceById(serviceId);
      if (!service) {
        res.status(404).json({ message: 'Hizmet bulunamadı' });
        return;
      }
      
      if (service.accountId !== accountId) {
        res.status(403).json({ message: 'Bu hizmeti silme yetkiniz yok' });
        return;
      }
      
      // Hizmeti sil
      await serviceService.deleteService(serviceId);
      
      res.status(200).json({
        success: true,
        message: 'Hizmet başarıyla silindi'
      });
    } catch (error) {
      console.error('Delete service error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Hizmet silinirken bir hata oluştu' 
        });
      }
    }
  }

  // -- MÜŞTERİ YÖNETİMİ --

  // Müşteri oluşturma
  async createClient(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ message: 'Yetkilendirme başarısız' });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
        return;
      }
      
      // Boş email ve telefonu null olarak ayarla
      if (!req.body.email || req.body.email.trim() === '') {
        req.body.email = null;
      }
      
      if (!req.body.phone || req.body.phone.trim() === '') {
        req.body.phone = null;
      }
      
      // Telefon numarası kontrolü - aynı işletmede aynı telefon ile başka müşteri var mı?
      if (req.body.phone) {
        const existingClientByPhone = await clientService.findClientByPhone(accountId, req.body.phone);
        if (existingClientByPhone) {
          res.status(400).json({ 
            success: false, 
            message: 'Bu telefon numarası ile kayıtlı bir müşteri zaten var' 
          });
          return;
        }
      }
      
      // E-posta kontrolü - aynı işletmede aynı e-posta ile başka müşteri var mı?
      if (req.body.email) {
        const existingClientByEmail = await clientService.findClientByEmail(accountId, req.body.email);
        if (existingClientByEmail) {
          res.status(400).json({ 
            success: false, 
            message: 'Bu e-posta adresi ile kayıtlı bir müşteri zaten var' 
          });
          return;
        }
      }
      
      // Müşteri oluştur
      const clientData = {
        ...req.body,
        accountId
      };
      
      const client = await clientService.createClient(clientData);
      
      res.status(201).json({
        success: true,
        message: 'Müşteri başarıyla oluşturuldu',
        client
      });
    } catch (error) {
      console.error('Create client error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Müşteri oluşturulurken bir hata oluştu' 
        });
      }
    }
  }

  // Müşterileri listeleme
  async getClients(req: Request, res: Response): Promise<void> {
    try {
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ message: 'Yetkilendirme başarısız' });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
        return;
      }
      
      // İşletmeye ait müşterileri getir
      const clients = await clientService.getClientsByAccountId(accountId);
      
      res.status(200).json({
        success: true,
        clients
      });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Müşteriler alınırken bir hata oluştu' 
      });
    }
  }

  // Müşteri detayı görüntüleme
  async getClientById(req: Request, res: Response): Promise<void> {
    try {
      const clientId = parseInt(req.params.id, 10);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ message: 'Yetkilendirme başarısız' });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
        return;
      }
      
      // Müşteriyi getir
      const client = await clientService.getClientById(clientId);
      if (!client) {
        res.status(404).json({ message: 'Müşteri bulunamadı' });
        return;
      }
      
      // Müşterinin işletmeye ait olup olmadığını kontrol et
      if (client.accountId !== accountId) {
        res.status(403).json({ message: 'Bu müşteriyi görüntüleme yetkiniz yok' });
        return;
      }
      
      res.status(200).json({
        success: true,
        client
      });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Müşteri bilgileri alınırken bir hata oluştu' 
      });
    }
  }

  // Müşteri güncelleme
  async updateClient(req: Request, res: Response): Promise<void> {
    try {
      const clientId = parseInt(req.params.id, 10);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Müşteriyi kontrol et
      const client = await clientService.getClientById(clientId);
      if (!client) {
        res.status(404).json({ 
          success: false, 
          message: 'Müşteri bulunamadı' 
        });
        return;
      }
      
      // Bu müşterinin işletmeye ait olup olmadığını kontrol et
      if (client.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu müşteriyi güncelleme yetkiniz yok' 
        });
        return;
      }
      
      // Boş email ve telefonu null olarak ayarla
      if (req.body.email === '' || (req.body.email && req.body.email.trim() === '')) {
        req.body.email = null;
      }
      
      if (req.body.phone === '' || (req.body.phone && req.body.phone.trim() === '')) {
        req.body.phone = null;
      }
      
      // Telefon numarası kontrolü - farklı müşterilerde aynı telefon var mı?
      if (req.body.phone && req.body.phone !== client.phone) {
        const existingClientByPhone = await clientService.findClientByPhone(accountId, req.body.phone);
        if (existingClientByPhone && existingClientByPhone.id !== clientId) {
          res.status(400).json({ 
            success: false, 
            message: 'Bu telefon numarası ile kayıtlı başka bir müşteri zaten var' 
          });
          return;
        }
      }
      
      // E-posta kontrolü - farklı müşterilerde aynı e-posta var mı?
      if (req.body.email && req.body.email !== client.email) {
        const existingClientByEmail = await clientService.findClientByEmail(accountId, req.body.email);
        if (existingClientByEmail && existingClientByEmail.id !== clientId) {
          res.status(400).json({ 
            success: false, 
            message: 'Bu e-posta adresi ile kayıtlı başka bir müşteri zaten var' 
          });
          return;
        }
      }
      
      // Güncelleme verilerini hazırla
      const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        email: req.body.email
      };
      
      // Müşteriyi güncelle
      const updatedClient = await clientService.updateClient(clientId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Müşteri başarıyla güncellendi',
        client: updatedClient
      });
    } catch (error) {
      console.error('Update client error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Müşteri güncellenirken bir hata oluştu' 
        });
      }
    }
  }

  // -- RANDEVU YÖNETİMİ --

  // Randevu oluşturma
  async createAppointment(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }

      // ServiceId'yi number'a dönüştür
      const serviceIdNum = parseInt(req.body.serviceId, 10);
      if (isNaN(serviceIdNum)) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz hizmet ID formatı. Sayısal bir değer giriniz.'
        });
        return;
      }
      
      // Hizmetin var olup olmadığını kontrol et
      const service = await serviceService.getServiceById(serviceIdNum);
      if (!service) {
        res.status(404).json({
          success: false,
          message: `#${serviceIdNum} ID'li hizmet bulunamadı.`
        });
        return;
      }

      // Hizmetin bu işletmeye ait olup olmadığını kontrol et
      if (service.accountId !== accountId) {
        res.status(403).json({
          success: false,
          message: `#${serviceIdNum} ID'li hizmet sizin işletmenize ait değil.`
        });
        return;
      }
      
      // Müşteri ismine göre müşteri kaydını bul ve kalan seans sayısını kontrol et
      const customerName = req.body.customerName.trim();
      
      // Müşteri adından isim ve soyisim ayır
      const nameParts = customerName.split(' ');
      let firstName = '';
      let lastName = '';

      if (nameParts.length > 1) {
        // Eğer birden fazla kelime varsa, son kelime soyisim, geri kalanı isim olsun
        lastName = nameParts.pop() || '';
        firstName = nameParts.join(' ');
      } else {
        // Tek kelime varsa isim olarak kabul et
        firstName = customerName;
      }
      
      // Müşteri adına göre müşteri ara
      const potentialClients = await clientService.searchClientsByName(accountId, firstName);
      
      if (potentialClients.length > 0) {
        // Mevcut randevuları kontrol et
        const upcomingAppointments = await appointmentService.getUpcomingAppointmentsByCustomerAndService(
          accountId, customerName, serviceIdNum
        );
        const appointmentCount = upcomingAppointments.length;
        
        // Müşterinin kalan seanslarını kontrol et
        let maxRemainingSession = 0;
        
        for (const client of potentialClients) {
          // Bu hizmete ait ve kalan seansı olan satışları bul
          const sales = await saleService.getSalesByClientId(client.id, accountId);
          
          for (const sale of sales) {
            if (sale.serviceId === serviceIdNum && sale.remainingSessions > 0) {
              // En yüksek kalan seans sayısını bul
              maxRemainingSession = Math.max(maxRemainingSession, sale.remainingSessions);
            }
          }
        }
        
        // Eğer aktif randevu sayısı kalan seans sayısından fazlaysa hata ver
        if (maxRemainingSession > 0 && appointmentCount >= maxRemainingSession) {
          res.status(400).json({
            success: false,
            message: `Bu müşteri için bu hizmete ait maksimum ${maxRemainingSession} randevu planlanabilir. Şu anda ${appointmentCount} adet planlanmış randevu bulunmaktadır.`
          });
          return;
        }
      }
      
      // StaffId'yi kontrol et ve işlem yap
      let staffId = null;
      
      // Eğer staffId istek içinde geldiyse, personel ataması yapılacak
      if (req.body.staffId) {
        const staffIdNum = parseInt(req.body.staffId, 10);
        if (isNaN(staffIdNum)) {
          res.status(400).json({
            success: false,
            message: 'Geçersiz personel ID formatı. Sayısal bir değer giriniz.'
          });
          return;
        }
        
        // Personelin var olup olmadığını kontrol et
        const staff = await prisma.staff.findUnique({
          where: { id: staffIdNum }
        });
        
        if (!staff) {
          res.status(404).json({
            success: false,
            message: `#${staffIdNum} ID'li personel bulunamadı.`
          });
          return;
        }
        
        // Personelin bu işletmeye ait olup olmadığını kontrol et
        if (staff.accountId !== accountId) {
          res.status(403).json({
            success: false,
            message: `#${staffIdNum} ID'li personel sizin işletmenize ait değil.`
          });
          return;
        }
        
        staffId = staffIdNum;
      } else {
        // Eğer personel belirtilmezse, owner'a ait bir staff kaydını bul (veya oluştur)
        const ownerStaff = await prisma.staff.findFirst({
          where: { 
            accountId: accountId,
            role: "İşletme Sahibi"
          }
        });
        
        if (ownerStaff) {
          staffId = ownerStaff.id;
        } else {
          // İşletme sahibine ait bir staff kaydı yoksa, oluştur
          const newOwnerStaff = await prisma.staff.create({
            data: {
              accountId: accountId,
              fullName: owner.username || "İşletme Sahibi",
              role: "İşletme Sahibi",
              email: owner.email,
              phone: owner.phone,
              isActive: true
            }
          });
          
          staffId = newOwnerStaff.id;
        }
      }
      
      // Randevu oluştur
      const appointmentData = {
        customerName: req.body.customerName,
        serviceId: serviceIdNum,
        staffId: staffId,  // staffId alanını tekrar ekleyelim
        appointmentDate: new Date(req.body.appointmentDate),
        notes: req.body.notes,
        accountId,
        status: req.body.status || "Planned"
      };
      
      console.log("Appointment Data:", JSON.stringify(appointmentData, null, 2));
      
      const appointment = await appointmentService.createAppointment(appointmentData);
      
      res.status(201).json({
        success: true,
        message: 'Randevu başarıyla oluşturuldu',
        appointment
      });
    } catch (error) {
      console.error('Create appointment error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Randevu oluşturulurken bir hata oluştu' 
        });
      }
    }
  }

  // Randevuları listeleme
  async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ message: 'Yetkilendirme başarısız' });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
        return;
      }
      
      // İşletmeye ait randevuları getir
      const appointments = await appointmentService.getAppointmentsByAccountId(accountId);
      
      res.status(200).json({
        success: true,
        appointments
      });
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Randevular alınırken bir hata oluştu' 
      });
    }
  }

  // Belirli bir tarihe göre randevuları listeleme
  async getAppointmentsByDate(req: Request, res: Response): Promise<void> {
    try {
      const dateStr = req.params.date; // YYYY-MM-DD formatında
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        res.status(400).json({ message: 'Geçersiz tarih formatı. YYYY-MM-DD kullanın' });
        return;
      }
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ message: 'Yetkilendirme başarısız' });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
        return;
      }
      
      // Belirli tarihteki randevuları getir
      const appointments = await appointmentService.getAppointmentsByDate(accountId, date);
      
      res.status(200).json({
        success: true,
        date: dateStr,
        appointments
      });
    } catch (error) {
      console.error('Get appointments by date error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Randevular alınırken bir hata oluştu' 
      });
    }
  }

  // Randevu güncelleme
  async updateAppointment(req: Request, res: Response): Promise<void> {
    try {
      const appointmentId = parseInt(req.params.id, 10);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Randevuyu kontrol et
      const appointment = await appointmentService.getAppointmentById(appointmentId);
      if (!appointment) {
        res.status(404).json({ 
          success: false, 
          message: 'Randevu bulunamadı' 
        });
        return;
      }
      
      // Bu randevunun işletmeye ait olup olmadığını kontrol et
      if (appointment.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu randevuya erişim yetkiniz yok' 
        });
        return;
      }
      
      // Güncelleme verilerini hazırla
      const updateData: any = {};
      if (req.body.customerName) updateData.customerName = req.body.customerName;
      if (req.body.appointmentDate) updateData.appointmentDate = new Date(req.body.appointmentDate);
      if (req.body.notes) updateData.notes = req.body.notes;
      if (req.body.status) updateData.status = req.body.status;
      
      if (req.body.serviceId) {
        const serviceId = parseInt(req.body.serviceId, 10);
        // Hizmetin varlığını ve işletmeye ait olduğunu kontrol et
        const service = await serviceService.getServiceById(serviceId);
        if (!service) {
          res.status(404).json({ 
            success: false, 
            message: 'Hizmet bulunamadı' 
          });
          return;
        }
        
        if (service.accountId !== accountId) {
          res.status(403).json({ 
            success: false, 
            message: 'Bu hizmete erişim yetkiniz yok' 
          });
          return;
        }
        
        updateData.serviceId = serviceId;
      }
      
      // Personel ataması güncellemesi
      if (req.body.staffId) {
        const staffIdNum = parseInt(req.body.staffId, 10);
        if (isNaN(staffIdNum)) {
          res.status(400).json({
            success: false,
            message: 'Geçersiz personel ID formatı. Sayısal bir değer giriniz.'
          });
          return;
        }
        
        // Personelin var olup olmadığını kontrol et
        const staff = await prisma.staff.findUnique({
          where: { id: staffIdNum }
        });
        
        if (!staff) {
          res.status(404).json({
            success: false,
            message: `#${staffIdNum} ID'li personel bulunamadı.`
          });
          return;
        }
        
        // Personelin bu işletmeye ait olup olmadığını kontrol et
        if (staff.accountId !== accountId) {
          res.status(403).json({
            success: false,
            message: `#${staffIdNum} ID'li personel sizin işletmenize ait değil.`
          });
          return;
        }
        
        // Şema kontrol edildi, staffId alanı appointments tablosunda var
        updateData.staffId = staffIdNum;
      }
      
      // Randevuyu güncelle
      const updatedAppointment = await appointmentService.updateAppointment(appointmentId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Randevu başarıyla güncellendi',
        appointment: updatedAppointment
      });
    } catch (error) {
      console.error('Update appointment error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Randevu güncellenirken bir hata oluştu' 
        });
      }
    }
  }

  // Randevu silme
  async deleteAppointment(req: Request, res: Response): Promise<void> {
    try {
      const appointmentId = parseInt(req.params.id, 10);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Randevuyu kontrol et
      const appointment = await appointmentService.getAppointmentById(appointmentId);
      if (!appointment) {
        res.status(404).json({ 
          success: false, 
          message: 'Randevu bulunamadı' 
        });
        return;
      }
      
      // Bu randevunun işletmeye ait olup olmadığını kontrol et
      if (appointment.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu randevuya erişim yetkiniz yok' 
        });
        return;
      }
      
      // Randevuyu sil
      await appointmentService.deleteAppointment(appointmentId);
      
      res.status(200).json({
        success: true,
        message: 'Randevu başarıyla silindi'
      });
    } catch (error) {
      console.error('Delete appointment error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Randevu silinirken bir hata oluştu' 
        });
      }
    }
  }

  // Randevu durumunu güncelleme
  async updateAppointmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const appointmentId = parseInt(req.params.id, 10);
      const { status } = req.body;
      
      if (!status || !Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
        res.status(400).json({ 
          success: false, 
          message: 'Geçersiz randevu durumu. Geçerli değerler: Planned, Completed, Cancelled' 
        });
        return;
      }
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Randevuyu kontrol et
      const appointment = await appointmentService.getAppointmentById(appointmentId);
      if (!appointment) {
        res.status(404).json({ 
          success: false, 
          message: 'Randevu bulunamadı' 
        });
        return;
      }
      
      // Bu randevunun işletmeye ait olup olmadığını kontrol et
      if (appointment.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu randevuya erişim yetkiniz yok' 
        });
        return;
      }
      
      // Randevu durumunu güncelle
      const updatedAppointment = await appointmentService.updateAppointmentStatus(appointmentId, status as AppointmentStatus);
      
      // Eğer randevu durumu "Completed" ise, kalan seansları kontrol et ve bir seans düş
      if (status === AppointmentStatus.Completed) {
        try {
          // Müşteri adından isim ve soyisim ayır
          const nameParts = appointment.customerName.split(' ');
          let firstName = '';
          let lastName = '';

          if (nameParts.length > 1) {
            // Eğer birden fazla kelime varsa, son kelime soyisim, geri kalanı isim olsun
            lastName = nameParts.pop() || '';
            firstName = nameParts.join(' ');
          } else {
            // Tek kelime varsa isim olarak kabul et
            firstName = appointment.customerName;
          }

          // Müşteri adına göre müşteri ara
          const potentialClients = await clientService.searchClientsByName(accountId, firstName);
          
          if (potentialClients.length > 0) {
            // İlgili müşterinin satışlarını kontrol et
            let usedSession = false;
            
            for (const client of potentialClients) {
              // Müşterinin bu hizmete ait aktif satışları var mı?
              const sales = await saleService.getSalesByClientId(client.id, accountId);
              
              // Bu hizmete ait ve kalan seansı olan satışı bul
              const activeSale = sales.find(
                sale => sale.serviceId === appointment.serviceId && sale.remainingSessions > 0
              );
              
              if (activeSale) {
                // Personel bilgisini aktar (any olarak işleyelim)
                const staffId = (appointment as any).staffId;
                
                // Seans kullan - personel bilgisini de aktar
                await saleService.useSession(activeSale.id, staffId);
                
                // Başarılı yanıt dön
                usedSession = true;
                res.status(200).json({
                  success: true,
                  message: `Randevu durumu '${status}' olarak güncellendi ve 1 seans kullanıldı`,
                  appointment: updatedAppointment
                });
                
                break; // İşlem yapıldı, döngüyü sonlandır
              }
            }
            
            // Eğer seans kullanımı yapılmadıysa normal yanıtı dön
            if (!usedSession) {
              res.status(200).json({
                success: true,
                message: `Randevu durumu '${status}' olarak güncellendi`,
                appointment: updatedAppointment
              });
            }
          } else {
            // Müşteri bulunamadı, sadece randevu durumu güncellendi
            res.status(200).json({
              success: true,
              message: `Randevu durumu '${status}' olarak güncellendi`,
              appointment: updatedAppointment
            });
          }
        } catch (error) {
          console.error('Seans kullanma hatası:', error);
          // Sadece randevu durumu güncellendi, seans kullanımında hata oluştu
          res.status(200).json({
            success: true,
            message: `Randevu durumu '${status}' olarak güncellendi, ancak seans kullanımı sırasında hata oluştu`,
            appointment: updatedAppointment
          });
        }
      } else {
        // "Completed" değilse normal yanıtı dön
        res.status(200).json({
          success: true,
          message: `Randevu durumu '${status}' olarak güncellendi`,
          appointment: updatedAppointment
        });
      }
    } catch (error) {
      console.error('Update appointment status error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Randevu durumu güncellenirken bir hata oluştu' 
        });
      }
    }
  }

  // Duruma göre randevuları listeleme
  async getAppointmentsByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.params;
      
      if (!status || !Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
        res.status(400).json({ 
          success: false, 
          message: 'Geçersiz randevu durumu. Geçerli değerler: Planned, Completed, Cancelled' 
        });
        return;
      }
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Belirli durumdaki randevuları getir
      const appointments = await appointmentService.getAppointmentsByAccountIdAndStatus(accountId, status as AppointmentStatus);
      
      res.status(200).json({
        success: true,
        status,
        appointments
      });
    } catch (error) {
      console.error('Get appointments by status error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Randevular alınırken bir hata oluştu' 
      });
    }
  }

  // -- SATIŞ YÖNETİMİ --

  // Satış oluşturma
  async createSale(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
        return;
      }

      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }

      // Client'in bu işletmeye ait olup olmadığını kontrol et
      const clientId = parseInt(req.body.clientId, 10);
      const client = await clientService.getClientById(clientId);
      
      if (!client) {
        res.status(404).json({ 
          success: false, 
          message: 'Müşteri bulunamadı' 
        });
        return;
      }
      
      if (client.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu müşteri sizin işletmenize ait değil' 
        });
        return;
      }
      
      // Service'in bu işletmeye ait olup olmadığını kontrol et
      const serviceId = parseInt(req.body.serviceId, 10);
      const service = await serviceService.getServiceById(serviceId);
      
      if (!service) {
        res.status(404).json({ 
          success: false, 
          message: 'Hizmet bulunamadı' 
        });
        return;
      }
      
      if (service.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu hizmet sizin işletmenize ait değil' 
        });
        return;
      }
      
      // Satış oluştur
      const saleData = {
        clientId,
        serviceId,
        remainingSessions: req.body.remainingSessions ? parseInt(req.body.remainingSessions, 10) : undefined,
        saleDate: req.body.saleDate ? new Date(req.body.saleDate) : undefined,
        accountId
      };
      
      const sale = await saleService.createSale(saleData);
      
      res.status(201).json({
        success: true,
        message: 'Satış başarıyla oluşturuldu',
        sale
      });
    } catch (error) {
      console.error('Create sale error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Satış oluşturulurken bir hata oluştu' 
        });
      }
    }
  }

  // İşletmeye ait tüm satışları listeleme
  async getSales(req: Request, res: Response): Promise<void> {
    try {
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // İşletmeye ait satışları getir
      const sales = await saleService.getSalesByAccountId(accountId);
      
      res.status(200).json({
        success: true,
        sales
      });
    } catch (error) {
      console.error('Get sales error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Satışlar alınırken bir hata oluştu' 
      });
    }
  }

  // Müşteriye ait satışları listeleme
  async getClientSales(req: Request, res: Response): Promise<void> {
    try {
      const clientId = parseInt(req.params.id, 10);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Müşterinin bu işletmeye ait olup olmadığını kontrol et
      const client = await clientService.getClientById(clientId);
      if (!client) {
        res.status(404).json({ 
          success: false, 
          message: 'Müşteri bulunamadı' 
        });
        return;
      }
      
      if (client.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu müşteriye erişim yetkiniz yok' 
        });
        return;
      }
      
      // Müşteriye ait satışları getir
      const sales = await saleService.getSalesByClientId(clientId, accountId);
      
      res.status(200).json({
        success: true,
        clientId,
        sales
      });
    } catch (error) {
      console.error('Get client sales error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Müşteri satışları alınırken bir hata oluştu' 
      });
    }
  }

  // Satış detayını görüntüleme
  async getSaleById(req: Request, res: Response): Promise<void> {
    try {
      const saleId = parseInt(req.params.id, 10);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Satışı getir
      const sale = await saleService.getSaleById(saleId);
      if (!sale) {
        res.status(404).json({ 
          success: false, 
          message: 'Satış bulunamadı' 
        });
        return;
      }
      
      // Satışın bu işletmeye ait olup olmadığını kontrol et
      if (sale.client.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu satışa erişim yetkiniz yok' 
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        sale
      });
    } catch (error) {
      console.error('Get sale error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Satış bilgileri alınırken bir hata oluştu' 
      });
    }
  }

  // -- ÖDEME YÖNETİMİ --

  // Ödeme oluşturma
  async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
        return;
      }

      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }

      // Satışı kontrol et
      const saleId = parseInt(req.body.saleId, 10);
      const sale = await saleService.getSaleById(saleId);
      
      if (!sale) {
        res.status(404).json({ 
          success: false, 
          message: 'Satış bulunamadı' 
        });
        return;
      }
      
      // Satışın bu işletmeye ait olup olmadığını kontrol et
      if (sale.client.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu satışa ödeme ekleme yetkiniz yok' 
        });
        return;
      }
      
      // Ödeme tutarını kontrol et
      const amountPaid = parseFloat(req.body.amountPaid);
      if (isNaN(amountPaid) || amountPaid <= 0) {
        res.status(400).json({ 
          success: false, 
          message: 'Geçerli bir ödeme tutarı giriniz' 
        });
        return;
      }
      
      // Ödeme yöntemini kontrol et
      const validPaymentMethods = ['Cash', 'CreditCard', 'Transfer', 'Other'];
      if (!validPaymentMethods.includes(req.body.paymentMethod)) {
        res.status(400).json({ 
          success: false, 
          message: 'Geçerli bir ödeme yöntemi giriniz (Cash, CreditCard, Transfer, Other)' 
        });
        return;
      }
      
      // Ödeme oluştur
      const paymentData = {
        saleId,
        amountPaid,
        paymentMethod: req.body.paymentMethod,
        notes: req.body.notes,
        accountId
      };
      
      const payment = await saleService.createPayment(paymentData);
      
      res.status(201).json({
        success: true,
        message: 'Ödeme başarıyla kaydedildi',
        payment
      });
    } catch (error) {
      console.error('Create payment error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Ödeme kaydedilirken bir hata oluştu' 
        });
      }
    }
  }

  // Satışa ait tüm ödemeleri getir
  async getSalePayments(req: Request, res: Response): Promise<void> {
    try {
      const saleId = parseInt(req.params.id, 10);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Satışı getir
      const sale = await saleService.getSaleById(saleId);
      if (!sale) {
        res.status(404).json({ 
          success: false, 
          message: 'Satış bulunamadı' 
        });
        return;
      }
      
      // Satışın bu işletmeye ait olup olmadığını kontrol et
      if (sale.client.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu satışa erişim yetkiniz yok' 
        });
        return;
      }
      
      // Ödeme bilgilerini hesapla
      const payments = sale.payments;
      const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
      const totalPrice = Number(sale.service.price);
      const remainingAmount = totalPrice - totalPaid;
      
      res.status(200).json({
        success: true,
        saleId,
        serviceId: sale.serviceId,
        serviceName: sale.service.serviceName,
        totalPrice,
        totalPaid,
        remainingAmount,
        payments
      });
    } catch (error) {
      console.error('Get sale payments error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ödeme bilgileri alınırken bir hata oluştu' 
      });
    }
  }

  // -- SEANS YÖNETİMİ --

  // Tüm seansları personel bilgileriyle getirme
  async getAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Filtreleri hazırla
      const filters: any = {};
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.staffId) {
        filters.staffId = parseInt(req.query.staffId as string, 10);
      }
      
      if (req.query.status) {
        filters.status = req.query.status as 'Scheduled' | 'Completed' | 'Missed';
      }

      // Satış ID'sine göre filtreleme
      if (req.query.saleId) {
        filters.saleId = parseInt(req.query.saleId as string, 10);
      }
      
      // Hizmet ID'sine göre filtreleme
      if (req.query.serviceId) {
        filters.serviceId = parseInt(req.query.serviceId as string, 10);
      }
      
      const sessions = await saleService.getAllSessions(accountId, Object.keys(filters).length > 0 ? filters : undefined);
      
      // Formatlanmış veriyi hazırla
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        sessionDate: session.sessionDate,
        status: session.status,
        staff: session.staff ? {
          id: session.staff.id,
          fullName: session.staff.fullName,
          role: session.staff.role
        } : null,
        client: {
          id: session.sale.client.id,
          fullName: `${session.sale.client.firstName} ${session.sale.client.lastName}`,
          phone: session.sale.client.phone
        },
        service: {
          id: session.sale.service.id,
          name: session.sale.service.serviceName
        },
        notes: session.notes
      }));
      
      res.status(200).json({
        success: true,
        sessions: formattedSessions
      });
    } catch (error) {
      console.error('Get all sessions error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Seans bilgileri alınırken bir hata oluştu' 
      });
    }
  }
  
  // Müşterinin kalan seanslarını getirme
  async getClientRemainingSessions(req: Request, res: Response): Promise<void> {
    try {
      const clientId = parseInt(req.params.id, 10);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Müşterinin bu işletmeye ait olup olmadığını kontrol et
      const client = await clientService.getClientById(clientId);
      if (!client) {
        res.status(404).json({ 
          success: false, 
          message: 'Müşteri bulunamadı' 
        });
        return;
      }
      
      if (client.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu müşteriye erişim yetkiniz yok' 
        });
        return;
      }
      
      // Müşterinin kalan seanslarını getir
      const remainingSessions = await saleService.getRemainingSessionsForClient(clientId, accountId);
      
      res.status(200).json({
        success: true,
        clientId,
        clientName: `${client.firstName} ${client.lastName}`,
        remainingSessions
      });
    } catch (error) {
      console.error('Get client remaining sessions error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Müşteri seans bilgileri alınırken bir hata oluştu' 
      });
    }
  }

  // Seans kullanımı kaydetme
  async useSession(req: Request, res: Response): Promise<void> {
    try {
      const saleId = parseInt(req.params.id, 10);
      let staffId = req.body.staffId ? parseInt(req.body.staffId, 10) : undefined;
      const sessionDate = req.body.sessionDate ? new Date(req.body.sessionDate) : undefined;
      const notes = req.body.notes;
      
      // Debug için gelen verileri logla
      console.log("Seans kullanımı isteği:", {
        saleId,
        staffId,
        sessionDate,
        notes,
        rawBody: req.body
      });
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      // @ts-ignore
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Satışı getir
      const sale = await saleService.getSaleById(saleId);
      if (!sale) {
        res.status(404).json({ 
          success: false, 
          message: 'Satış bulunamadı' 
        });
        return;
      }
      
      // Satışın bu işletmeye ait olup olmadığını kontrol et
      if (sale.client.accountId !== accountId) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu satışa erişim yetkiniz yok' 
        });
        return;
      }
      
      // Kalan seans kontrolü
      if (sale.remainingSessions <= 0) {
        res.status(400).json({ 
          success: false, 
          message: 'Bu satış için kalan seans bulunmamaktadır' 
        });
        return;
      }
      
      // Personel varlık kontrolü
      if (staffId !== undefined) {
        const staff = await prisma.staff.findUnique({
          where: { id: staffId }
        });
        
        if (!staff) {
          console.warn(`Belirtilen personel (ID: ${staffId}) bulunamadı, seans personelsiz olarak kaydediliyor.`);
          // Personel bulunamadığında null olarak ayarla
          staffId = undefined;
        } else if (staff.accountId !== accountId) {
          // Personel başka işletmeye aitse uyarı ver
          console.warn(`Belirtilen personel (ID: ${staffId}) bu işletmeye ait değil.`);
          staffId = undefined;
        }
      }
      
      // Seans kullanımını kaydet
      const result = await saleService.useSession(saleId, staffId, sessionDate, notes);
      
      res.status(200).json({
        success: true,
        message: 'Seans kullanımı başarıyla kaydedildi',
        saleId,
        remainingSessions: result.remainingSessions,
        sessionRecord: result.sessionRecord
      });
    } catch (error) {
      console.error('Use session error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Seans kullanımı kaydedilirken bir hata oluştu' 
        });
      }
    }
  }

  // Dashboard istatistiklerini getir
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Dashboard istatistiklerini al
      const stats = await dashboardService.getDashboardStats(accountId);
      
      res.status(200).json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Dashboard istatistikleri alınırken bir hata oluştu' 
      });
    }
  }

  // Personel güncelleme
  async updateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const employeeId = parseInt(req.params.id, 10);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      const ownerAccountId = owner.accountId;
      if (!ownerAccountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Employee'yi kontrol et
      const employee = await userService.findUserById(employeeId);
      if (!employee) {
        res.status(404).json({ 
          success: false, 
          message: 'Personel bulunamadı' 
        });
        return;
      }
      
      // Bu personelin işletmeye ait olup olmadığını kontrol et
      if (employee.accountId !== ownerAccountId || employee.role !== UserRole.EMPLOYEE) {
        res.status(403).json({ 
          success: false, 
          message: 'Bu personeli güncelleme yetkiniz yok' 
        });
        return;
      }
      
      // Güncelleme verilerini hazırla
      const { fullName, role, email, phone, workingHours } = req.body;
      
      // Staff tablosundaki bilgileri güncelle
      const staffUpdate: any = {};
      
      if (fullName) staffUpdate.fullName = fullName;
      if (role) staffUpdate.role = role;
      if (email) staffUpdate.email = email;
      if (phone) staffUpdate.phone = phone;
      
      // Personelin staff kaydını bul
      const staff = await prisma.staff.findFirst({
        where: { 
          accountId: ownerAccountId,
          email: employee.email
        }
      });
      
      if (!staff) {
        res.status(404).json({ 
          success: false, 
          message: 'Personel kaydı bulunamadı' 
        });
        return;
      }
      
      // Çalışma saatlerini doğrulama (eğer varsa)
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
        
        // Çalışma saatlerini güncellemeye dahil et
        staffUpdate.workingHours = workingHours;
      }
      
      // Personel bilgilerini güncelle
      const updatedStaff = await staffService.updateStaff(staff.id, staffUpdate);
      
      // User tablosundaki bilgileri güncelle
      const userUpdate: any = {};
      if (email) userUpdate.email = email;
      if (phone) userUpdate.phone = phone;
      if (fullName) userUpdate.username = fullName.split(' ')[0]; // İlk kelimeyi kullanıcı adı olarak kullan
      
      // Eğer kullanıcı bilgisi güncellenecekse
      if (Object.keys(userUpdate).length > 0) {
        await userService.updateEmployee(employeeId, ownerAccountId, userUpdate);
      }
      
      // Güncel personel bilgilerini getir
      const updatedStaffData = await prisma.staff.findUnique({
        where: { id: staff.id }
      });
      
      // Çalışma saatlerini ayrıca getir
      const updatedWorkingHours = await getWorkingHoursForStaff(staff.id);
      
      // Türkçe gün adlarını ekle
      const weekDays = [
        'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
      ];
      
      const formattedWorkingHours = updatedWorkingHours.map(wh => ({
        ...wh,
        dayName: weekDays[wh.dayOfWeek]
      }));
      
      // Staff ve workingHours verilerini birleştir
      const updatedStaffWithDetails = {
        ...updatedStaffData,
        workingHours: formattedWorkingHours
      };
      
      res.status(200).json({
        success: true,
        message: 'Personel bilgileri başarıyla güncellendi',
        employee: {
          id: employee.id,
          username: employee.username,
          email: userUpdate.email || employee.email,
          role: employee.role,
          accountId: employee.accountId,
          staff: updatedStaffWithDetails
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
          message: 'Personel bilgileri güncellenirken bir hata oluştu' 
        });
      }
    }
  }

  // Personel detaylarını getirme
  async getEmployeeDetails(req: Request, res: Response): Promise<void> {
    try {
      const staffId = parseInt(req.params.id, 10);
      
      // Owner'ın işletme ID'sini al
      const ownerId = req.user?.userId;
      if (!ownerId) {
        res.status(401).json({ 
          success: false, 
          message: 'Yetkilendirme başarısız' 
        });
        return;
      }
      
      const owner = await userService.findUserById(ownerId);
      if (!owner) {
        res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
        return;
      }
      
      const accountId = owner.accountId;
      if (!accountId) {
        res.status(404).json({ 
          success: false, 
          message: 'İşletme bilgisi bulunamadı' 
        });
        return;
      }
      
      // Personel bilgisini getir
      const staff = await prisma.staff.findUnique({
        where: { id: staffId }
      });
      
      if (!staff) {
        res.status(404).json({
          success: false,
          message: 'Personel bulunamadı'
        });
        return;
      }
      
      if (staff.accountId !== accountId) {
        res.status(403).json({
          success: false,
          message: 'Bu personel sizin işletmenize ait değil'
        });
        return;
      }
      
      // Çalışma saatlerini manuel olarak getir
      const workingHours = await getWorkingHoursForStaff(staffId);
      
      // Personelin user hesabı bilgisini getir
      const user = staff.email 
        ? await prisma.user.findFirst({
            where: { 
              email: staff.email,
              accountId: accountId 
            },
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              accountId: true
            }
          })
        : null;
      
      // Çalışma günlerini Türkçe olarak formatla
      const weekDays = [
        'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
      ];
      
      // Çalışma saatlerini formatla
      const formattedWorkingHours = workingHours.map(wh => ({
        id: wh.id,
        dayOfWeek: wh.dayOfWeek,
        dayName: weekDays[wh.dayOfWeek],
        startTime: wh.startTime,
        endTime: wh.endTime,
        isWorking: wh.isWorking
      }));
      
      // Personel randevularını bul
      const appointments = await prisma.appointments.findMany({
        where: {
          staffId: staffId,
          accountId: accountId
        },
        include: {
          service: true
        },
        orderBy: {
          appointmentDate: 'desc'
        },
        take: 10 // En son 10 randevu
      });
      
      res.status(200).json({
        success: true,
        staff: {
          ...staff,
          user,
          workingHours: formattedWorkingHours,
          appointments // Personelin en son randevuları
        }
      });
    } catch (error) {
      console.error('Get employee details error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Personel bilgileri alınırken bir hata oluştu' 
      });
    }
  }
}