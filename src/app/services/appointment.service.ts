import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { StaffService } from './staff.service';

const prisma = new PrismaClient();
const staffService = new StaffService();

export interface AppointmentInput {
  customerName: string;
  serviceId: number;
  appointmentDate: Date;
  notes?: string;
  accountId: number;
  staffId?: number;
  status?: AppointmentStatus;
}

export class AppointmentService {
  // Randevu oluşturma
  async createAppointment(data: AppointmentInput) {
    console.log("Service received data:", JSON.stringify(data, null, 2));

    try {
      // Randevu oluştur
      const appointment = await prisma.appointments.create({
        data: {
          customerName: data.customerName,
          serviceId: data.serviceId,
          appointmentDate: data.appointmentDate,
          staffId: data.staffId,  // Şemada varsa kullan
          notes: data.notes,
          accountId: data.accountId,
          status: data.status || AppointmentStatus.Planned
        },
        include: {
          service: true
        }
      });

      // Staff bilgilerini manuel olarak getir
      let staff = null;
      if (data.staffId) {
        try {
          staff = await staffService.getStaffById(data.staffId);
        } catch (error) {
          console.error("Staff fetch error:", error);
        }
      }

      // Appointment ve staff verilerini birleştir
      return {
        ...appointment,
        staff
      };
    } catch (error) {
      console.error("Prisma Error:", error);
      throw error;
    }
  }

  // ID'ye göre randevu getirme
  async getAppointmentById(appointmentId: number) {
    try {
      const appointment = await prisma.appointments.findUnique({
        where: { id: appointmentId },
        include: {
          service: true
        }
      });

      if (!appointment) return null;

      // Staff bilgilerini manuel olarak getir
      let staff = null;
      if (appointment.staffId) {
        try {
          staff = await staffService.getStaffById(appointment.staffId);
        } catch (error) {
          console.error("Staff fetch error:", error);
        }
      }

      // Appointment ve staff verilerini birleştir
      return {
        ...appointment,
        staff
      };
    } catch (error) {
      console.error("Get appointment error:", error);
      throw error;
    }
  }

  // İşletmeye ait tüm randevuları getirme
  async getAppointmentsByAccountId(accountId: number) {
    try {
      const appointments = await prisma.appointments.findMany({
        where: { accountId },
        include: {
          service: true
        },
        orderBy: { appointmentDate: 'asc' }
      });

      // Her randevu için staff bilgilerini manuel olarak getir
      const appointmentsWithStaff = await Promise.all(
        appointments.map(async appointment => {
          let staff = null;
          if (appointment.staffId) {
            try {
              staff = await staffService.getStaffById(appointment.staffId);
            } catch (error) {
              console.error(`Staff fetch error for appointmentId ${appointment.id}:`, error);
            }
          }
          return {
            ...appointment,
            staff
          };
        })
      );

      return appointmentsWithStaff;
    } catch (error) {
      console.error("Get appointments error:", error);
      throw error;
    }
  }

  // Belirli bir tarihte olan randevuları getirme
  async getAppointmentsByDate(accountId: number, date: Date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const appointments = await prisma.appointments.findMany({
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

      // Her randevu için staff bilgilerini manuel olarak getir
      const appointmentsWithStaff = await Promise.all(
        appointments.map(async appointment => {
          let staff = null;
          if (appointment.staffId) {
            try {
              staff = await staffService.getStaffById(appointment.staffId);
            } catch (error) {
              console.error(`Staff fetch error for appointmentId ${appointment.id}:`, error);
            }
          }
          return {
            ...appointment,
            staff
          };
        })
      );

      return appointmentsWithStaff;
    } catch (error) {
      console.error("Get appointments by date error:", error);
      throw error;
    }
  }

  // Gelecek randevuları getirme
  async getUpcomingAppointments(accountId: number) {
    try {
      const now = new Date();
      
      const appointments = await prisma.appointments.findMany({
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

      // Her randevu için staff bilgilerini manuel olarak getir
      const appointmentsWithStaff = await Promise.all(
        appointments.map(async appointment => {
          let staff = null;
          if (appointment.staffId) {
            try {
              staff = await staffService.getStaffById(appointment.staffId);
            } catch (error) {
              console.error(`Staff fetch error for appointmentId ${appointment.id}:`, error);
            }
          }
          return {
            ...appointment,
            staff
          };
        })
      );

      return appointmentsWithStaff;
    } catch (error) {
      console.error("Get upcoming appointments error:", error);
      throw error;
    }
  }

  // Randevu güncelleme
  async updateAppointment(appointmentId: number, data: Partial<Omit<AppointmentInput, 'accountId'>>) {
    try {
      const appointment = await prisma.appointments.update({
        where: { id: appointmentId },
        data,   // data içinde staffId de olabilir
        include: {
          service: true
        }
      });

      // Staff bilgilerini manuel olarak getir
      let staff = null;
      if (appointment.staffId) {
        try {
          staff = await staffService.getStaffById(appointment.staffId);
        } catch (error) {
          console.error("Staff fetch error:", error);
        }
      }

      // Appointment ve staff verilerini birleştir
      return {
        ...appointment,
        staff
      };
    } catch (error) {
      console.error("Update appointment error:", error);
      throw error;
    }
  }

  // Randevu silme
  async deleteAppointment(appointmentId: number) {
    return await prisma.appointments.delete({
      where: { id: appointmentId }
    });
  }

  // Randevu durumunu güncelleme
  async updateAppointmentStatus(appointmentId: number, status: AppointmentStatus) {
    try {
      const appointment = await prisma.appointments.update({
        where: { id: appointmentId },
        data: { status },
        include: {
          service: true
        }
      });

      // Staff bilgilerini manuel olarak getir
      let staff = null;
      if (appointment.staffId) {
        try {
          staff = await staffService.getStaffById(appointment.staffId);
        } catch (error) {
          console.error("Staff fetch error:", error);
        }
      }

      // Appointment ve staff verilerini birleştir
      return {
        ...appointment,
        staff
      };
    } catch (error) {
      console.error("Update appointment status error:", error);
      throw error;
    }
  }

  // Belirli bir duruma göre randevuları getirme
  async getAppointmentsByAccountIdAndStatus(accountId: number, status: AppointmentStatus) {
    try {
      const appointments = await prisma.appointments.findMany({
        where: {
          accountId,
          status
        },
        include: {
          service: true
        },
        orderBy: { appointmentDate: 'asc' }
      });

      // Her randevu için staff bilgilerini manuel olarak getir
      const appointmentsWithStaff = await Promise.all(
        appointments.map(async appointment => {
          let staff = null;
          if (appointment.staffId) {
            try {
              staff = await staffService.getStaffById(appointment.staffId);
            } catch (error) {
              console.error(`Staff fetch error for appointmentId ${appointment.id}:`, error);
            }
          }
          return {
            ...appointment,
            staff
          };
        })
      );

      return appointmentsWithStaff;
    } catch (error) {
      console.error("Get appointments by status error:", error);
      throw error;
    }
  }

  // Müşteri ismi ve hizmet ID'sine göre gelecekteki randevuları getirme
  async getUpcomingAppointmentsByCustomerAndService(accountId: number, customerName: string, serviceId: number) {
    try {
      const now = new Date();
      
      const appointments = await prisma.appointments.findMany({
        where: {
          accountId,
          customerName,
          serviceId,
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

      // Her randevu için staff bilgilerini manuel olarak getir
      const appointmentsWithStaff = await Promise.all(
        appointments.map(async appointment => {
          let staff = null;
          if (appointment.staffId) {
            try {
              staff = await staffService.getStaffById(appointment.staffId);
            } catch (error) {
              console.error(`Staff fetch error for appointmentId ${appointment.id}:`, error);
            }
          }
          return {
            ...appointment,
            staff
          };
        })
      );

      return appointmentsWithStaff;
    } catch (error) {
      console.error("Get upcoming appointments by customer and service error:", error);
      throw error;
    }
  }
} 