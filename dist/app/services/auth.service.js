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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../../config/prisma"));
const error_util_1 = require("../utils/error.util");
const client_1 = require("@prisma/client");
const JWT_SECRET = process.env.JWT_SECRET || 'randevu-sistemi-secret-key';
class AuthService {
    static register(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = yield prisma_1.default.user.findUnique({
                where: { email: data.email }
            });
            if (existing) {
                throw new error_util_1.AppError(400, 'Bu e-posta adresi zaten kullanımda');
            }
            const hashedPassword = yield bcryptjs_1.default.hash(data.password, 10);
            const user = yield prisma_1.default.user.create({
                data: {
                    username: data.username,
                    email: data.email,
                    password: hashedPassword,
                    phone: data.phone || '',
                    // @ts-ignore
                    role: data.role || client_1.UserRole.EMPLOYEE
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    phone: true,
                    role: true
                }
            });
            return user;
        });
    }
    static login(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma_1.default.user.findUnique({
                where: { email: data.email }
            });
            if (!user) {
                throw new error_util_1.AppError(401, 'Kullanıcı bulunamadı');
            }
            const isMatch = yield bcryptjs_1.default.compare(data.password, user.password);
            if (!isMatch) {
                throw new error_util_1.AppError(401, 'Şifre yanlış');
            }
            const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
            return token;
        });
    }
}
exports.default = AuthService;
