import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ClientInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  accountId: number;
}

export class ClientService {
  // Müşteri oluşturma
  async createClient(data: ClientInput) {
    return await prisma.clients.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        accountId: data.accountId
      }
    });
  }

  // ID'ye göre müşteri getirme
  async getClientById(clientId: number) {
    return await prisma.clients.findUnique({
      where: { id: clientId }
    });
  }

  // İşletmeye ait tüm müşterileri getirme
  async getClientsByAccountId(accountId: number) {
    return await prisma.clients.findMany({
      where: { accountId }
    });
  }

  // Müşteri güncelleme
  async updateClient(clientId: number, data: Partial<ClientInput>) {
    const { notes, ...updateData } = data;
    return await prisma.clients.update({
      where: { id: clientId },
      data: updateData
    });
  }

  // Müşteri silme
  async deleteClient(clientId: number) {
    return await prisma.clients.delete({
      where: { id: clientId }
    });
  }

  // İsme göre müşteri arama
  async searchClientsByName(accountId: number, searchTerm: string) {
    return await prisma.clients.findMany({
      where: {
        accountId,
        OR: [
          { firstName: { contains: searchTerm } },
          { lastName: { contains: searchTerm } }
        ]
      }
    });
  }

  // Email'e göre müşteri arama
  async findClientByEmail(accountId: number, email: string) {
    return await prisma.clients.findFirst({
      where: {
        accountId,
        email
      }
    });
  }

  // Telefona göre müşteri arama
  async findClientByPhone(accountId: number, phone: string) {
    return await prisma.clients.findFirst({
      where: {
        accountId,
        phone
      }
    });
  }
} 