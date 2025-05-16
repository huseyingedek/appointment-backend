import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface AppointmentInput {
  customerName: string;
  serviceId: number;
  appointmentDate: Date;
  notes?: string;
  accountId: number;
  staffId?: number;
  status?: AppointmentStatus;
}

// Personel verilerini almak için yardımcı bir sınıf
class StaffService {
  async getStaffById(staffId: number) {
    if (!staffId) return null;
    return await prisma.staff.findUnique({
      where: { id: staffId }
    });
  }
}

const staffService = new StaffService();

export class AppointmentService {
  // Randevu oluşturma
  async createAppointment(data: AppointmentInput) {
    console.log("Service received data:", JSON.stringify(data, null, 2));

    try {
      const appointment = await prisma.appointments.create({
        data: {
          customerName: data.customerName,
          serviceId: data.serviceId,
          appointmentDate: data.appointmentDate,
          staffId: data.staffId,
          notes: data.notes,
          accountId: data.accountId,
          status: data.status || AppointmentStatus.Planned
        },
        include: {
          service: true
        }
      });

      // Staff bilgilerini ayrıca al
      let staff = null;
      if (appointment.staffId) {
        staff = await staffService.getStaffById(appointment.staffId);
      }

      // Staff bilgilerini ekleyerek dön
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
    const appointment = await prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: {
        service: true
      }
    });

    if (!appointment) return null;

    // Staff bilgilerini ayrıca al
    let staff = null;
    if (appointment.staffId) {
      staff = await staffService.getStaffById(appointment.staffId);
    }

    // Staff bilgilerini ekleyerek dön
    return {
      ...appointment,
      staff
    };
  }

  // İşletmeye ait tüm randevuları getirme
  async getAppointmentsByAccountId(accountId: number) {
    const appointments = await prisma.appointments.findMany({
      where: { accountId },
      include: {
        service: true
      },
      orderBy: { appointmentDate: 'asc' }
    });

    // Her randevu için staff bilgilerini al
    const appointmentsWithStaff = await Promise.all(
      appointments.map(async (appointment) => {
        let staff = null;
        if (appointment.staffId) {
          staff = await staffService.getStaffById(appointment.staffId);
        }
        return {
          ...appointment,
          staff
        };
      })
    );

    return appointmentsWithStaff;
  }

  // Belirli bir tarihte olan randevuları getirme
  async getAppointmentsByDate(accountId: number, date: Date) {
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

    // Her randevu için staff bilgilerini al
    const appointmentsWithStaff = await Promise.all(
      appointments.map(async (appointment) => {
        let staff = null;
        if (appointment.staffId) {
          staff = await staffService.getStaffById(appointment.staffId);
        }
        return {
          ...appointment,
          staff
        };
      })
    );

    return appointmentsWithStaff;
  }

  // Gelecek randevuları getirme
  async getUpcomingAppointments(accountId: number) {
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

    // Her randevu için staff bilgilerini al
    const appointmentsWithStaff = await Promise.all(
      appointments.map(async (appointment) => {
        let staff = null;
        if (appointment.staffId) {
          staff = await staffService.getStaffById(appointment.staffId);
        }
        return {
          ...appointment,
          staff
        };
      })
    );

    return appointmentsWithStaff;
  }

  // Randevu güncelleme
  async updateAppointment(appointmentId: number, data: Partial<Omit<AppointmentInput, 'accountId'>>) {
    const appointment = await prisma.appointments.update({
      where: { id: appointmentId },
      data,
      include: {
        service: true
      }
    });

    // Staff bilgilerini ayrıca al
    let staff = null;
    if (appointment.staffId) {
      staff = await staffService.getStaffById(appointment.staffId);
    }

    // Staff bilgilerini ekleyerek dön
    return {
      ...appointment,
      staff
    };
  }

  // Randevu silme
  async deleteAppointment(appointmentId: number) {
    return await prisma.appointments.delete({
      where: { id: appointmentId }
    });
  }

  // Randevu durumunu güncelleme
  async updateAppointmentStatus(appointmentId: number, status: AppointmentStatus) {
    const appointment = await prisma.appointments.update({
      where: { id: appointmentId },
      data: { status },
      include: {
        service: true
      }
    });

    // Staff bilgilerini ayrıca al
    let staff = null;
    if (appointment.staffId) {
      staff = await staffService.getStaffById(appointment.staffId);
    }

    // Staff bilgilerini ekleyerek dön
    return {
      ...appointment,
      staff
    };
  }

  // Belirli bir duruma göre randevuları getirme
  async getAppointmentsByAccountIdAndStatus(accountId: number, status: AppointmentStatus) {
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

    // Her randevu için staff bilgilerini al
    const appointmentsWithStaff = await Promise.all(
      appointments.map(async (appointment) => {
        let staff = null;
        if (appointment.staffId) {
          staff = await staffService.getStaffById(appointment.staffId);
        }
        return {
          ...appointment,
          staff
        };
      })
    );

    return appointmentsWithStaff;
  }

  // Müşteri ismi ve hizmet ID'sine göre gelecekteki randevuları getirme
  async getUpcomingAppointmentsByCustomerAndService(accountId: number, customerName: string, serviceId: number) {
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

    // Her randevu için staff bilgilerini al
    const appointmentsWithStaff = await Promise.all(
      appointments.map(async (appointment) => {
        let staff = null;
        if (appointment.staffId) {
          staff = await staffService.getStaffById(appointment.staffId);
        }
        return {
          ...appointment,
          staff
        };
      })
    );

    return appointmentsWithStaff;
  }
} 