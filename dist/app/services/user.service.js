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
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
class UserService {
    // Kullanıcı oluşturma
    createUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const hashedPassword = yield bcrypt_1.default.hash(data.password, 10);
            return prisma.user.create({
                data: Object.assign(Object.assign({}, data), { password: hashedPassword }),
            });
        });
    }
    // Owner ve Account oluşturma (Admin tarafından)
    createOwnerWithAccount(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const hashedPassword = yield bcrypt_1.default.hash(data.password, 10);
            // Transaction kullanarak hem account hem de owner oluşturma
            return prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // Önce Account oluştur
                // @ts-ignore
                const account = yield tx.accounts.create({
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
                        role: client_1.UserRole.OWNER,
                        // @ts-ignore
                        accountId: account.id,
                    },
                });
            }));
        });
    }
    // Email ile kullanıcı bulma
    findUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.user.findUnique({
                where: { email },
            });
        });
    }
    // ID ile kullanıcı bulma
    findUserById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.user.findUnique({
                where: { id },
            });
        });
    }
    // Giriş işlemi için
    validateUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.findUserByEmail(data.email);
            if (!user) {
                return null;
            }
            const isPasswordValid = yield bcrypt_1.default.compare(data.password, user.password);
            if (!isPasswordValid) {
                return null;
            }
            return user;
        });
    }
    // Employee oluşturma (Owner tarafından)
    createEmployee(data, ownerAccountId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Owner'ın kendi işletmesi için personel oluşturması
            if (data.accountId !== ownerAccountId) {
                throw new Error('Sadece kendi işletmeniz için personel ekleyebilirsiniz');
            }
            const hashedPassword = yield bcrypt_1.default.hash(data.password, 10);
            // Transaction kullanarak hem user hem de staff oluşturma
            return prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // Önce user oluştur
                const user = yield tx.user.create({
                    data: Object.assign(Object.assign({}, data), { password: hashedPassword, 
                        // @ts-ignore
                        role: client_1.UserRole.EMPLOYEE }),
                });
                // Sonra staff tablosuna da ekle
                // @ts-ignore
                yield tx.staff.create({
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
            }));
        });
    }
}
exports.UserService = UserService;
