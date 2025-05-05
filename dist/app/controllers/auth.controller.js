"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const user_service_1 = require("../services/user.service");
const jwt_1 = require("../utils/jwt");
const express_validator_1 = require("express-validator");
const userService = new user_service_1.UserService();
class AuthController {
    // Kullanıcı giriş işlemi
    login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({ errors: errors.array() });
                    return;
                }
                const loginData = req.body;
                const user = yield userService.validateUser(loginData);
                if (!user) {
                    res.status(401).json({ message: 'Geçersiz email veya şifre' });
                    return;
                }
                // Token oluştur
                const token = (0, jwt_1.generateToken)(user);
                res.status(200).json({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        // @ts-ignore - User modelinde accountId özelliği var
                        accountId: user.accountId
                    }
                });
            }
            catch (error) {
                console.error('Login error:', error);
                res.status(500).json({ message: 'Sunucu hatası' });
            }
        });
    }
    // Mevcut kullanıcı bilgilerini getirme
    getCurrentUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user || !req.user.userId) {
                    res.status(401).json({ message: 'Yetkilendirme başarısız' });
                    return;
                }
                const user = yield userService.findUserById(req.user.userId);
                if (!user) {
                    res.status(404).json({ message: 'Kullanıcı bulunamadı' });
                    return;
                }
                res.status(200).json({
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        // @ts-ignore - User modelinde accountId özelliği var
                        accountId: user.accountId
                    }
                });
            }
            catch (error) {
                console.error('Get current user error:', error);
                res.status(500).json({ message: 'Sunucu hatası' });
            }
        });
    }
}
exports.AuthController = AuthController;
