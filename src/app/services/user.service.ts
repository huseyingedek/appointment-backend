import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { StaffService, WorkingHourInput } from './staff.service';

const prisma = new PrismaClient();
const staffService = new StaffService();

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  accountId?: number;
  fullName?: string;
  workingHours?: WorkingHourInput[];
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

  async createUser(data: CreateUserInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async createOwnerWithAccount(data: CreateOwnerInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return prisma.$transaction(async (tx) => {

      const account = await tx.accounts.create({
        data: {
          businessName: data.businessName,
          contactPerson: data.contactPerson,
          email: data.businessEmail || data.email,
          phone: data.businessPhone || data.phone,
          subscriptionPlan: data.subscriptionPlan || 'Basic',
        },
      });
      
      return tx.user.create({
        data: {
          username: data.username,
          email: data.email,
          password: hashedPassword,
          phone: data.phone,
          role: UserRole.OWNER,
          accountId: account.id,
        },
      });
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

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

  async getUserWithAccount(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        account: true
      }
    });
    
    return user;
  }

  async createEmployee(data: CreateUserInput, ownerAccountId: number): Promise<{ user: User, staffId: number }> {
    if (data.accountId !== ownerAccountId) {
      throw new Error('Sadece kendi işletmeniz için personel ekleyebilirsiniz');
    }
    
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const { workingHours, fullName, ...userData } = data;
    
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          role: UserRole.EMPLOYEE,
        },
      });
      
      const staff = await tx.staff.create({
        data: {
          fullName: fullName || data.username,
          email: data.email,
          phone: data.phone,
          role: 'Personel',
          isActive: true,
          accountId: ownerAccountId
        }
      });
      
      return { user, staffId: staff.id };
    });
    
    if (workingHours && workingHours.length > 0) {
      try {
        await staffService.setWorkingHours(result.staffId, workingHours);
      } catch (error) {
        console.error('Çalışma saatleri eklenirken hata oluştu:', error);
      }
    }
    
    return result;
  }

  async getAllAccounts() {

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
          take: 5,
          orderBy: {
            createdAt: 'desc'
          }
        },
        appointments: {
          take: 5,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

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

  async deactivateAccount(accountId: number) {
    return prisma.accounts.update({
      where: { id: accountId },
      data: {
        isActive: false
      }
    });
  }

  async deleteAccount(accountId: number) {
    
    await prisma.user.deleteMany({
      where: { accountId }
    });
    
    return prisma.accounts.delete({
      where: { id: accountId }
    });
  }

  async getEmployeesByAccountId(accountId: number) {
    return prisma.user.findMany({
      where: { 
        accountId: accountId,
        role: UserRole.EMPLOYEE 
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true
      }
    });
  }

  async getEmployeeById(employeeId: number, accountId: number) {
    return prisma.user.findFirst({
      where: { 
        id: employeeId,
        accountId: accountId,
        role: UserRole.EMPLOYEE 
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true
      }
    });
  }

  async updateEmployee(employeeId: number, accountId: number, data: {
    username?: string;
    email?: string;
    phone?: string;
    password?: string;
    fullName?: string;
    workingHours?: WorkingHourInput[];
  }) {
    const employee = await this.getEmployeeById(employeeId, accountId);
    if (!employee) {
      throw new Error('Personel bulunamadı veya bu işletmeye ait değil');
    }

    const { workingHours, fullName, ...updateData } = data;
    
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: employeeId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true
      }
    });

    // Personel (Staff) bilgilerini güncelle
    let staffId: number | null = null;
    
    if (updateData.username || updateData.email || updateData.phone || fullName) {
      // Staff kaydını bul
      const staffRecord = await prisma.staff.findFirst({
        where: { 
          email: employee.email,
          accountId: accountId 
        }
      });
      
      if (staffRecord) {
        await prisma.staff.update({
          where: { id: staffRecord.id },
          data: {
            fullName: fullName || updateData.username || employee.username,
            email: updateData.email || employee.email,
            phone: updateData.phone || employee.phone
          }
        });
        
        staffId = staffRecord.id;
      }
    }
    
    // Çalışma saatlerini güncelle
    if (workingHours && workingHours.length > 0 && staffId) {
      try {
        await staffService.setWorkingHours(staffId, workingHours);
      } catch (error) {
        console.error('Çalışma saatleri güncellenirken hata oluştu:', error);
        // Hata olsa bile devam et, çünkü kullanıcı ve personel bilgileri zaten güncellendi
      }
    }

    return updatedUser;
  }

  async deleteEmployee(employeeId: number, accountId: number) {
    const employee = await this.getEmployeeById(employeeId, accountId);
    if (!employee) {
      throw new Error('Personel bulunamadı veya bu işletmeye ait değil');
    }

    await prisma.staff.deleteMany({
      where: { 
        email: employee.email, 
        accountId: accountId 
      }
    });

    return prisma.user.delete({
      where: { id: employeeId }
    });
  }
}