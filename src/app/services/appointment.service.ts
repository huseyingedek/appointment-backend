import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface AppointmentInput {
  customerName: string;
  serviceId: number;
  appointmentDate: Date;
  notes?: string;
  accountId: number;
  status?: AppointmentStatus;
}

export class AppointmentService {
  // Randevu oluşturma
  async createAppointment(data: AppointmentInput) {
    console.log("Service received data:", JSON.stringify(data, null, 2));

    try {
      return await prisma.appointments.create({
        data: {
          customerName: data.customerName,
          serviceId: data.serviceId,
          appointmentDate: data.appointmentDate,
          notes: data.notes,
          accountId: data.accountId,
          status: data.status || AppointmentStatus.Planned
        },
        include: {
          service: true
        }
      });
    } catch (error) {
      console.error("Prisma Error:", error);
      throw error;
    }
  }

  // ID'ye göre randevu getirme
  async getAppointmentById(appointmentId: number) {
    return await prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: {
        service: true
      }
    });
  }

  // İşletmeye ait tüm randevuları getirme
  async getAppointmentsByAccountId(accountId: number) {
    return await prisma.appointments.findMany({
      where: { accountId },
      include: {
        service: true
      },
      orderBy: { appointmentDate: 'asc' }
    });
  }

  // Belirli bir tarihte olan randevuları getirme
  async getAppointmentsByDate(accountId: number, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await prisma.appointments.findMany({
      where: {
        accountId,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        service: true
      },
      orderBy: { appointmentDate: 'asc' }
    });
  }

  // Gelecek randevuları getirme
  async getUpcomingAppointments(accountId: number) {
    const now = new Date();
    
    return await prisma.appointments.findMany({
      where: {
        accountId,
        appointmentDate: {
          gte: now
        },
        status: AppointmentStatus.Planned
      },
      include: {
        service: true
      },
      orderBy: { appointmentDate: 'asc' }
    });
  }

  // Randevu güncelleme
  async updateAppointment(appointmentId: number, data: Partial<Omit<AppointmentInput, 'accountId'>>) {
    return await prisma.appointments.update({
      where: { id: appointmentId },
      data,
      include: {
        service: true
      }
    });
  }

  // Randevu silme
  async deleteAppointment(appointmentId: number) {
    return await prisma.appointments.delete({
      where: { id: appointmentId }
    });
  }

  // Randevu durumunu güncelleme
  async updateAppointmentStatus(appointmentId: number, status: AppointmentStatus) {
    return await prisma.appointments.update({
      where: { id: appointmentId },
      data: { status },
      include: {
        service: true
      }
    });
  }

  // Belirli bir duruma göre randevuları getirme
  async getAppointmentsByAccountIdAndStatus(accountId: number, status: AppointmentStatus) {
    return await prisma.appointments.findMany({
      where: {
        accountId,
        status
      },
      include: {
        service: true
      },
      orderBy: { appointmentDate: 'asc' }
    });
  }
} 