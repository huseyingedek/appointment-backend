import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

interface RegisterUserDTO {
  email: string;
  username: string;
  password: string;
  phone?: string;
  role?: UserRole;
}

interface LoginUserDTO {
  email: string;
  password: string;
}

interface UserResponseDTO {
  id: number;
  email: string;
  username: string;
  phone?: string | null;
  role: UserRole;
  createdAt: Date;
}

interface AuthResponseDTO extends UserResponseDTO {
  token: string;
}

class AuthService {

  public async registerUser(userData: RegisterUserDTO): Promise<UserResponseDTO> {
    // Email zaten kullanılıyor mu kontrolü
    const isEmailUnique = await this.isEmailUnique(userData.email);
    if (!isEmailUnique) {
      throw new Error('Bu email adresi zaten kullanılıyor.');
    }

    // Rol geçerli mi kontrolü
    if (userData.role && !this.isValidRole(userData.role)) {
      throw new Error(`Geçersiz rol değeri. Geçerli roller: ${Object.values(UserRole).join(', ')}`);
    }

    const hashedPassword = await this.hashPassword(userData.password);
    
    return prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        password: hashedPassword,
        phone: userData.phone || null,
        role: userData.role || UserRole.USER
      },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });
  }

  public async loginUser(loginData: LoginUserDTO): Promise<AuthResponseDTO> {
    const user = await prisma.user.findUnique({
      where: { email: loginData.email },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new Error('Kullanıcı bulunamadı.');
    }

    const isPasswordValid = await this.comparePasswords(loginData.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Hatalı şifre.');
    }

    const token = this.generateToken(user.id);

    const { password, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      token
    };
  }

  private async isEmailUnique(email: string): Promise<boolean> {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    return !existingUser;
  }

  private isValidRole(role: string): boolean {
    return Object.values(UserRole).includes(role as UserRole);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private generateToken(userId: number): string {
    const secret = process.env.JWT_SECRET || 'randevu-sistemi-secret-key';
    
    return jwt.sign(
      { userId },
      secret,
      { expiresIn: '1d' }
    );
  }
}

export default new AuthService(); 