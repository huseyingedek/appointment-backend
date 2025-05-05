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
exports.AdminController = void 0;
const user_service_1 = require("../services/user.service");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const userService = new user_service_1.UserService();
class AdminController {
    // Admin tarafından Owner hesabı oluşturma
    createOwner(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Yetki kontrolü
                if (!req.user || req.user.role !== client_1.UserRole.ADMIN) {
                    res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekiyor' });
                    return;
                }
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({ errors: errors.array() });
                    return;
                }
                const ownerData = req.body;
                // Email kullanılıyor mu kontrol et
                const existingUser = yield userService.findUserByEmail(ownerData.email);
                if (existingUser) {
                    res.status(400).json({ message: 'Bu email adresi zaten kullanılıyor' });
                    return;
                }
                const newOwner = yield userService.createOwnerWithAccount(ownerData);
                res.status(201).json({
                    success: true,
                    message: 'İşletme sahibi başarıyla oluşturuldu',
                    owner: {
                        id: newOwner.id,
                        username: newOwner.username,
                        email: newOwner.email,
                        role: newOwner.role
                    }
                });
            }
            catch (error) {
                console.error('Create owner error:', error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: 'İşletme sahibi oluşturulurken bir hata oluştu'
                    });
                }
            }
        });
    }
}
exports.AdminController = AdminController;
