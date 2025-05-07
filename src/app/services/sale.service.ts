import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface SaleInput {
  clientId: number;
  serviceId: number;
  remainingSessions?: number;
  saleDate?: Date;
  accountId: number; // Bu sadece bizim API katmanımızda kullanılacak
}

export interface PaymentInput {
  saleId: number;
  amountPaid: number;
  paymentMethod: 'Cash' | 'CreditCard' | 'Transfer' | 'Other';
  notes?: string;
  accountId: number; // Bu sadece bizim API katmanımızda kullanılacak
}

export class SaleService {
  // Satış oluşturma
  async createSale(data: SaleInput) {
    // İlgili hizmeti bul
    const service = await prisma.services.findUnique({
      where: { id: data.serviceId }
    });
    
    if (!service) {
      throw new Error('Hizmet bulunamadı');
    }
    
    // Kalan seans sayısını belirle
    const remainingSessions = data.remainingSessions ?? service.sessionCount;
    
    // Satış oluştur
    return await prisma.sales.create({
      data: {
        client: { connect: { id: data.clientId } },
        service: { connect: { id: data.serviceId } },
        saleDate: data.saleDate || new Date(),
        remainingSessions
      }
    });
  }

  // ID'ye göre satış getirme
  async getSaleById(saleId: number) {
    return await prisma.sales.findUnique({
      where: { id: saleId },
      include: {
        client: true,
        service: true,
        payments: true
      }
    });
  }

  // İşletmeye ait tüm satışları getirme
  async getSalesByAccountId(accountId: number) {
    return await prisma.sales.findMany({
      where: { 
        client: { accountId }
      },
      include: {
        client: true,
        service: true,
        payments: true
      },
      orderBy: { saleDate: 'desc' }
    });
  }

  // Müşteriye ait tüm satışları getirme
  async getSalesByClientId(clientId: number, accountId: number) {
    return await prisma.sales.findMany({
      where: { 
        clientId,
        client: { accountId }
      },
      include: {
        service: true,
        payments: true
      },
      orderBy: { saleDate: 'desc' }
    });
  }

  // Satış güncelleme
  async updateSale(saleId: number, data: Partial<Omit<SaleInput, 'accountId' | 'clientId' | 'serviceId'>>) {
    // Sadece güvenli alanların güncellenmesi
    const { saleDate, remainingSessions } = data;
    
    return await prisma.sales.update({
      where: { id: saleId },
      data: {
        saleDate,
        remainingSessions
      }
    });
  }

  // Satış silme
  async deleteSale(saleId: number) {
    // Önce bu satışa ait ödemeleri sil
    await prisma.payments.deleteMany({
      where: { saleId }
    });
    
    // Satışa ait seansları sil
    await prisma.sessions.deleteMany({
      where: { saleId }
    });
    
    // Sonra satışı sil
    return await prisma.sales.delete({
      where: { id: saleId }
    });
  }

  // Ödeme oluşturma
  async createPayment(data: PaymentInput) {
    // İlgili satışı bul
    const sale = await prisma.sales.findUnique({
      where: { id: data.saleId },
      include: { 
        payments: true,
        service: true
      }
    });
    
    if (!sale) {
      throw new Error('Satış bulunamadı');
    }
    
    // Toplam ödemeleri hesapla - Decimal tipini number'a dönüştür
    const totalPaid = sale.payments.reduce(
      (sum, payment) => sum + Number(payment.amountPaid), 0
    );
    const newTotalPaid = totalPaid + data.amountPaid;
    
    // Ödemeyi oluştur
    return await prisma.payments.create({
      data: {
        sale: { connect: { id: data.saleId } },
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod,
        notes: data.notes
      }
    });
  }

  // Bir müşterinin kalan seanslarını getirme
  async getRemainingSessionsForClient(clientId: number, accountId: number) {
    const sales = await prisma.sales.findMany({
      where: {
        clientId,
        client: { accountId },
        remainingSessions: { gt: 0 }
      },
      include: {
        service: true
      }
    });
    
    return sales.map(sale => ({
      saleId: sale.id,
      serviceName: sale.service.serviceName,
      remainingSessions: sale.remainingSessions
    }));
  }

  // Seans kullanımını kaydetme
  async useSession(saleId: number, staffId?: number, sessionDate?: Date, notes?: string) {
    const sale = await prisma.sales.findUnique({
      where: { id: saleId },
      include: { service: true, client: true }
    });
    
    if (!sale) {
      throw new Error('Satış bulunamadı');
    }
    
    if (!sale.remainingSessions || sale.remainingSessions <= 0) {
      throw new Error('Bu satış için kalan seans bulunmamaktadır');
    }
    
    // Tamamlanan seans kaydı oluştur
    const sessionRecord = await prisma.sessions.create({
      data: {
        saleId: saleId,
        staffId: staffId || null,
        sessionDate: sessionDate || new Date(),
        status: 'Completed', // Tamamlandı olarak işaretle
        notes: notes || 'Seans tamamlandı'
      }
    });
    
    // Kalan seans sayısını güncelle
    const updatedSale = await prisma.sales.update({
      where: { id: saleId },
      data: {
        remainingSessions: sale.remainingSessions - 1
      }
    });
    
    return {
      ...updatedSale,
      sessionRecord
    };
  }

  // Tüm seansları personel bilgileriyle birlikte getirme
  async getAllSessions(accountId: number, filters?: {
    startDate?: Date,
    endDate?: Date,
    staffId?: number,
    status?: 'Scheduled' | 'Completed' | 'Missed',
    saleId?: number,
    serviceId?: number
  }) {
    const where: any = {
      sale: {
        client: { accountId }
      }
    };
    
    // Filtreler varsa ekle
    if (filters) {
      if (filters.startDate && filters.endDate) {
        where.sessionDate = {
          gte: filters.startDate,
          lte: filters.endDate
        };
      } else if (filters.startDate) {
        where.sessionDate = { gte: filters.startDate };
      } else if (filters.endDate) {
        where.sessionDate = { lte: filters.endDate };
      }
      
      if (filters.staffId) {
        where.staffId = filters.staffId;
      }
      
      if (filters.status) {
        where.status = filters.status;
      }

      // Satış ID'sine göre filtreleme
      if (filters.saleId) {
        where.saleId = filters.saleId;
      }
      
      // Hizmet ID'sine göre filtreleme
      if (filters.serviceId) {
        where.sale = {
          ...where.sale,
          serviceId: filters.serviceId
        };
      }
    }
    
    return await prisma.sessions.findMany({
      where,
      include: {
        staff: true,
        sale: {
          include: {
            client: true,
            service: true
          }
        }
      },
      orderBy: { sessionDate: 'desc' }
    });
  }
} 