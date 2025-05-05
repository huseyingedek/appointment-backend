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
exports.OwnerController = void 0;
const user_service_1 = require("../services/user.service");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const userService = new user_service_1.UserService();
class OwnerController {
    // Owner tarafından personel (employee) hesabı oluşturma
    createEmployee(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({ errors: errors.array() });
                    return;
                }
                // Owner'ın kendi ID'sini ve işletme ID'sini al
                const ownerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!ownerId) {
                    res.status(401).json({ message: 'Yetkilendirme başarısız' });
                    return;
                }
                const owner = yield userService.findUserById(ownerId);
                if (!owner) {
                    res.status(404).json({ message: 'Kullanıcı bulunamadı' });
                    return;
                }
                // @ts-ignore - Mevcut User modelinde accountId eksik olabilir, ama şemaya göre var
                const ownerAccountId = owner.accountId;
                if (!ownerAccountId) {
                    res.status(404).json({ message: 'İşletme bilgisi bulunamadı' });
                    return;
                }
                // Employee verilerini hazırla
                const employeeData = Object.assign(Object.assign({}, req.body), { 
                    // @ts-ignore
                    role: client_1.UserRole.EMPLOYEE, accountId: ownerAccountId // Owner'ın işletme ID'si
                 });
                // Email kullanılıyor mu kontrol et
                const existingUser = yield userService.findUserByEmail(employeeData.email);
                if (existingUser) {
                    res.status(400).json({
                        success: false,
                        message: 'Bu email adresi zaten kullanılıyor'
                    });
                    return;
                }
                // Personel oluşturma
                const employee = yield userService.createEmployee(employeeData, ownerAccountId);
                // @ts-ignore - accountId için
                const employeeAccountId = employee.accountId;
                res.status(201).json({
                    success: true,
                    message: 'Personel başarıyla oluşturuldu',
                    employee: {
                        id: employee.id,
                        username: employee.username,
                        email: employee.email,
                        role: employee.role,
                        accountId: employeeAccountId
                    }
                });
            }
            catch (error) {
                console.error('Create employee error:', error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: 'Personel oluşturulurken bir hata oluştu'
                    });
                }
            }
        });
    }
}
exports.OwnerController = OwnerController;
