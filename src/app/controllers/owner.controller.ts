import { Request, Response } from 'express';
import { UserService, CreateUserInput } from '../services/user.service';
import { ServiceService } from '../services/service.service';
import { ClientService } from '../services/client.service';
import { AppointmentService } from '../services/appointment.service';
import { SaleService } from '../services/sale.service';
import { validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';

const userService = new UserService();
const serviceService = new ServiceService();
const clientService = new ClientService();
const appointmentService = new AppointmentService();
const saleService = new SaleService();

export class OwnerController {
  // -- PERSONEL YÖNETİMİ --
  
  // Owner tarafından personel (employee) hesabı oluşturma
  async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      // Owner'ın kendi ID'sini ve işletme ID'sini al
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
      
      // @ts-ignore - Mevcut User modelinde accountId eksik olabilir, ama şemaya göre var
      const ownerAccountId = owner.accountId;
      if (!ownerAccountId) {
        res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
        return;
      }
      
      // Employee verilerini hazırla
      const employeeData: CreateUserInput = {
        ...req.body,
        // @ts-ignore
        role: UserRole.EMPLOYEE,
        accountId: ownerAccountId  // Owner'ın işletme ID'si
      };
      
      // Email kullanılıyor mu kontrol et
      const existingUser = await userService.findUserByEmail(employeeData.email);
      if (existingUser) {
        res.status(400).json({ 
          success: false, 
          message: 'Bu email adresi zaten kullanılıyor' 
        });
        return;
      }
      
      // Personel oluşturma
      const employee = await userService.createEmployee(employeeData, ownerAccountId);
      
      // @ts-ignore - accountId için
      const employeeAccountId = employee.accountId;
      
      res.status(201).json({
        success: true,
        message: 'Personel başarıyla oluşturuldu',
        employee: {
          id: employee.id,
          username: employee.username,
          email: employee.email,
          role: employee.role,
          accountId: employeeAccountId
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

  // -- HİZMET YÖNETİMİ --

  // Hizmet oluşturma
  async createService(req: Request, res: Response): Promise<void> {
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
      
      // Hizmet oluştur
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

  // Hizmetleri listeleme
  async getServices(req: Request, res: Response): Promise<void> {
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
      const clientId = parseInt(req.params.id);
      
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
      
      // Randevu oluştur
      const appointmentData = {
        customerName: req.body.customerName,
        serviceId: serviceIdNum,
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
}