import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface StaffInput {
  fullName: string;
  role?: string;
  email?: string;
  phone?: string;
  accountId: number;
  workingHours?: WorkingHourInput[];
}

export interface WorkingHourInput {
  dayOfWeek: number; // 0=Pazar, 1=Pazartesi, ... 6=Cumartesi
  startTime: string; // "09:00" formatında
  endTime: string;   // "17:00" formatında
  isWorking: boolean;
}

// Çalışma saatlerini getirmek için yardımcı fonksiyon
const getWorkingHoursForStaff = async (staffId: number) => {
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

export class StaffService {
  
  async createStaff(data: StaffInput) {
    const { workingHours, ...staffData } = data;
    
    if (workingHours && workingHours.length > 0) {
      // İlk önce personeli oluştur
      const staff = await prisma.staff.create({
        data: staffData
      });
      
      // Sonra çalışma saatlerini ekle
      try {
        for (const hour of workingHours) {
          await prisma.workingHours.create({
            data: {
              staffId: staff.id,
              dayOfWeek: hour.dayOfWeek,
              startTime: hour.startTime,
              endTime: hour.endTime,
              isWorking: hour.isWorking === false ? false : true
            }
          });
        }
      } catch (error) {
        console.error("Error creating working hours:", error);
      }
      
      // Çalışma saatlerini manuel olarak getir
      const staffWorkingHours = await getWorkingHoursForStaff(staff.id);
      
      // Veriyi birleştir ve döndür
      return {
        ...staff,
        workingHours: staffWorkingHours
      };
    } else {
      return await prisma.staff.create({
        data: staffData
      });
    }
  }

  // Personel bilgilerini getirme
  async getStaffById(staffId: number) {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId }
    });
    
    if (!staff) return null;
    
    // Çalışma saatlerini manuel olarak getir
    const workingHours = await getWorkingHoursForStaff(staffId);
    
    // Veriyi birleştir ve döndür
    return {
      ...staff,
      workingHours
    };
  }

  // İşletmeye ait personelleri getirme
  async getStaffByAccountId(accountId: number) {
    const staffList = await prisma.staff.findMany({
      where: { 
        accountId,
        isActive: true 
      },
      orderBy: { fullName: 'asc' }
    });
    
    // Her personel için çalışma saatlerini getir ve birleştir
    const staffWithWorkingHours = await Promise.all(
      staffList.map(async (staff) => {
        const workingHours = await getWorkingHoursForStaff(staff.id);
        return {
          ...staff,
          workingHours
        };
      })
    );
    
    return staffWithWorkingHours;
  }

  // Personel bilgilerini güncelleme
  async updateStaff(staffId: number, data: Partial<StaffInput>) {
    const { workingHours, ...staffData } = data;
    
    if (workingHours) {
      try {
        // Mevcut çalışma saatlerini temizle
        await prisma.workingHours.deleteMany({
          where: { staffId }
        });
        
        // Yeni çalışma saatlerini ekle
        if (workingHours.length > 0) {
          for (const hour of workingHours) {
            await prisma.workingHours.create({
              data: {
                staffId,
                dayOfWeek: hour.dayOfWeek,
                startTime: hour.startTime,
                endTime: hour.endTime,
                isWorking: hour.isWorking === false ? false : true
              }
            });
          }
        }
      } catch (error) {
        console.error("Çalışma saatleri güncellenirken hata:", error);
      }
    }
    
    // Personel bilgilerini güncelle
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: staffData
    });
    
    // Çalışma saatlerini manuel olarak getir
    const updatedWorkingHours = await getWorkingHoursForStaff(staffId);
    
    // Veriyi birleştir ve döndür
    return {
      ...updatedStaff,
      workingHours: updatedWorkingHours
    };
  }

  // Personeli pasife alma
  async deactivateStaff(staffId: number) {
    return await prisma.staff.update({
      where: { id: staffId },
      data: { isActive: false }
    });
  }
  
  // Personel çalışma saatlerini ayarlama
  async setWorkingHours(staffId: number, workingHours: WorkingHourInput[]) {
    // Önce personelin varlığını kontrol et
    const staff = await prisma.staff.findUnique({
      where: { id: staffId }
    });
    
    if (!staff) {
      throw new Error(`StaffID: ${staffId} bulunamadı.`);
    }
    
    // Önce mevcut çalışma saatlerini temizle - safe delete kullanarak
    try {
      await prisma.workingHours.deleteMany({
        where: { staffId }
      });
    } catch (error) {
      console.error('Mevcut çalışma saatleri silinemedi:', error);
      // İşleme devam et
    }
    
    // Çalışma saatlerini tek tek ekle
    const results = [];
    
    for (const hour of workingHours) {
      try {
        const createdHour = await prisma.workingHours.create({
          data: {
            staffId,
            dayOfWeek: hour.dayOfWeek,
            startTime: hour.startTime,
            endTime: hour.endTime,
            isWorking: hour.isWorking === false ? false : true
          }
        });
        results.push(createdHour);
      } catch (error) {
        console.error(`Çalışma saati eklenirken hata: gün ${hour.dayOfWeek}`, error);
        // Hatayı yut ve diğer çalışma saatleri için devam et
      }
    }
    
    return await this.getStaffById(staffId);
  }
  
  // Personel çalışma saatlerini getirme
  async getWorkingHours(staffId: number) {
    return await prisma.workingHours.findMany({
      where: { staffId },
      orderBy: { dayOfWeek: 'asc' }
    });
  }
} 