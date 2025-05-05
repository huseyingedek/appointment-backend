import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  accountId?: number;
}

export interface CreateOwnerInput {
  username: string;
  email: string;
  password: string;
  phone?: string;
  businessName: string;
  contactPerson?: string;
  businessEmail?: string;
  businessPhone?: string;
  subscriptionPlan?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class UserService {
  // Kullanıcı oluşturma
  async createUser(data: CreateUserInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  // Owner ve Account oluşturma (Admin tarafından)
  async createOwnerWithAccount(data: CreateOwnerInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Transaction kullanarak hem account hem de owner oluşturma
    return prisma.$transaction(async (tx) => {
      // Önce Account oluştur
      // @ts-ignore
      const account = await tx.accounts.create({
        data: {
          businessName: data.businessName,
          contactPerson: data.contactPerson,
          email: data.businessEmail || data.email,
          phone: data.businessPhone || data.phone,
          subscriptionPlan: data.subscriptionPlan || 'Basic',
        },
      });
      
      // Sonra owner rolünde kullanıcı oluştur
      return tx.user.create({
        data: {
          username: data.username,
          email: data.email,
          password: hashedPassword,
          phone: data.phone,
          // @ts-ignore
          role: UserRole.OWNER,
          // @ts-ignore
          accountId: account.id,
        },
      });
    });
  }

  // Email ile kullanıcı bulma
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  // ID ile kullanıcı bulma
  async findUserById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  // Giriş işlemi için
  async validateUser(data: LoginInput): Promise<User | null> {
    const user = await this.findUserByEmail(data.email);
    
    if (!user) {
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }
    
    return user;
  }

  // Employee oluşturma (Owner tarafından)
  async createEmployee(data: CreateUserInput, ownerAccountId: number): Promise<User> {
    // Owner'ın kendi işletmesi için personel oluşturması
    if (data.accountId !== ownerAccountId) {
      throw new Error('Sadece kendi işletmeniz için personel ekleyebilirsiniz');
    }
    
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Transaction kullanarak hem user hem de staff oluşturma
    return prisma.$transaction(async (tx) => {
      // Önce user oluştur
      const user = await tx.user.create({
        data: {
          ...data,
          password: hashedPassword,
          // @ts-ignore
          role: UserRole.EMPLOYEE,
        },
      });
      
      // Sonra staff tablosuna da ekle
      // @ts-ignore
      await tx.staff.create({
        data: {
          fullName: data.username,
          email: data.email,
          phone: data.phone,
          role: 'Personel', // veya başka bir rol belirleyebilirsiniz
          isActive: true,
          accountId: ownerAccountId
        }
      });
      
      return user;
    });
  }

  // Tüm işletmeleri getir (Sadece Admin için)
  async getAllAccounts() {
    // Tüm işletmeleri getir, sahiplerini de include et
    return prisma.accounts.findMany({
      include: {
        users: {
          where: {
            role: UserRole.OWNER
          },
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
  
  // İşletme detayını getir (Sadece Admin için)
  async getAccountById(accountId: number) {
    return prisma.accounts.findUnique({
      where: { id: accountId },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            role: true
          }
        },
        services: true,
        clients: {
          take: 5, // Son 5 müşteriyi getir
          orderBy: {
            createdAt: 'desc'
          }
        },
        appointments: {
          take: 5, // Son 5 randevuyu getir
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  // İşletme bilgilerini güncelleme (Sadece Admin için)
  async updateAccount(accountId: number, data: {
    businessName?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    subscriptionPlan?: string;
    isActive?: boolean;
  }) {
    return prisma.accounts.update({
      where: { id: accountId },
      data
    });
  }

  // İşletme silme (Sadece Admin için)
  // Not: Gerçek bir silme işlemi yapmak yerine işletmeyi pasife alma
  async deactivateAccount(accountId: number) {
    return prisma.accounts.update({
      where: { id: accountId },
      data: {
        isActive: false
      }
    });
  }

  // İşletmeyi tamamen silme (Dikkatli kullanılmalı)
  async deleteAccount(accountId: number) {
    // NOT: Gerçek uygulamada ilişkili verileri silmek veya arşivlemek için
    // daha kapsamlı bir işlem gerekebilir. Bu örnek basitleştirilmiştir.
    
    // İşletmeye ait kullanıcıları sil
    await prisma.user.deleteMany({
      where: { accountId }
    });
    
    // İşletmeyi sil
    return prisma.accounts.delete({
      where: { id: accountId }
    });
  }
}