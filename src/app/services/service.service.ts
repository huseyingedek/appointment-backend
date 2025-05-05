import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ServiceInput {
  serviceName: string;
  price: number;
  durationMinutes?: number;
  description?: string;
  sessionCount?: number;
  accountId: number;
}

export class ServiceService {
  // Hizmet oluşturma
  async createService(data: ServiceInput) {
    return await prisma.services.create({
      data: {
        serviceName: data.serviceName,
        price: data.price,
        durationMinutes: data.durationMinutes || 60, // Varsayılan 60 dakika
        description: data.description,
        sessionCount: data.sessionCount || 1, // Varsayılan 1 seans
        accountId: data.accountId
      }
    });
  }

  // ID'ye göre hizmet getirme
  async getServiceById(serviceId: number) {
    return await prisma.services.findUnique({
      where: { id: serviceId }
    });
  }

  // İşletmeye ait tüm hizmetleri getirme
  async getServicesByAccountId(accountId: number) {
    return await prisma.services.findMany({
      where: { accountId }
    });
  }

  // Hizmet güncelleme
  async updateService(serviceId: number, data: Partial<ServiceInput>) {
    return await prisma.services.update({
      where: { id: serviceId },
      data
    });
  }

  // Hizmet silme
  async deleteService(serviceId: number) {
    return await prisma.services.delete({
      where: { id: serviceId }
    });
  }
} 