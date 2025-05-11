import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardService {
  async getDashboardStats(accountId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    try {
      const appointments = await prisma.appointments.findMany({
        where: {
          accountId,
          appointmentDate: {
            gte: thirtyDaysAgo
          }
        }
      });

      // Randevu istatistikleri
      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter(a => a.status === AppointmentStatus.Completed).length;
      const cancelledAppointments = appointments.filter(a => a.status === AppointmentStatus.Cancelled).length;
      const pendingAppointments = appointments.filter(a => a.status === AppointmentStatus.Planned).length;

      const newCustomersToday = await prisma.clients.count({
        where: {
          accountId,
          createdAt: {
            gte: today
          }
        }
      });

      const totalCustomers = await prisma.clients.count({
        where: {
          accountId
        }
      });

      const totalPayments = await prisma.payments.findMany({
        where: {
          sale: {
            client: {
              accountId
            }
          }
        },
        select: {
          amountPaid: true,
          paymentDate: true
        }
      });

      const totalRevenue = totalPayments.reduce((sum, payment) => {
        return sum + Number(payment.amountPaid);
      }, 0);

      const todayRevenue = totalPayments
        .filter(payment => payment.paymentDate >= today)
        .reduce((sum, payment) => sum + Number(payment.amountPaid), 0);

      const monthlyAppointmentsData = await this.getMonthlyAppointmentsData(accountId, startOfYear);

      return {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        pendingAppointments,
        totalCustomers,
        newCustomersToday,
        totalRevenue,
        todayRevenue,
        monthlyAppointments: monthlyAppointmentsData
      };
    } catch (error) {
      console.error("Dashboard stats error:", error);
      throw error;
    }
  }

  private async getMonthlyAppointmentsData(accountId: number, startOfYear: Date) {
    const monthNames = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];

    const currentMonth = new Date().getMonth();
    const monthlyData = [];

    for (let i = 0; i <= currentMonth; i++) {
      const startOfMonth = new Date(startOfYear.getFullYear(), i, 1);
      const endOfMonth = new Date(startOfYear.getFullYear(), i + 1, 0, 23, 59, 59, 999);

      const appointmentsInMonth = await prisma.appointments.findMany({
        where: {
          accountId,
          appointmentDate: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      const completed = appointmentsInMonth.filter(a => a.status === AppointmentStatus.Completed).length;
      const pending = appointmentsInMonth.filter(a => a.status === AppointmentStatus.Planned).length;
      const cancelled = appointmentsInMonth.filter(a => a.status === AppointmentStatus.Cancelled).length;

      monthlyData.push({
        name: monthNames[i],
        completed,
        pending,
        cancelled
      });
    }

    return monthlyData;
  }
} 