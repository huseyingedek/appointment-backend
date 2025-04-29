import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import authService from '../services/auth.service';


class AuthController {
  /**
   * @route POST /auth/register
   * @param req Express Request nesnesi
   * @param res Express Response nesnesi
   * @returns Oluşturulan kullanıcı bilgisi veya hata mesajı
   */
  public async register(req: Request, res: Response): Promise<Response> {
    try {
      const { email, username, password, phone, role } = req.body;

      const newUser = await authService.registerUser({
        email,
        username,
        password,
        phone,
        role: role as UserRole
      });

      return res.status(201).json({
        success: true,
        message: 'Kullanıcı başarıyla oluşturuldu.',
        data: newUser
      });

    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        if (errorMessage.includes('email formatı') || 
            errorMessage.includes('zaten kullanılıyor') || 
            errorMessage.includes('Geçersiz rol')) {
          return res.status(400).json({
            success: false,
            message: errorMessage
          });
        }
      }

      console.error('Register error:', error);
      return res.status(500).json({
        success: false,
        message: 'Kullanıcı oluşturulurken bir hata oluştu.',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * @route POST /auth/login
   * @param req Express Request nesnesi
   * @param res Express Response nesnesi
   * @returns Kullanıcı bilgisi ve token veya hata mesajı
   */
  public async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      const userData = await authService.loginUser({
        email,
        password
      });

      return res.status(200).json({
        success: true,
        message: 'Giriş başarılı.',
        data: userData
      });

    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        if (errorMessage.includes('Kullanıcı bulunamadı') || 
            errorMessage.includes('Hatalı şifre')) {
          return res.status(401).json({
            success: false,
            message: errorMessage
          });
        }
      }

      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Giriş yapılırken bir hata oluştu.',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }
}

export default new AuthController();
