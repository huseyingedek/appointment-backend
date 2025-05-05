"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
// src/utils/jwt.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-değiştir';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        role: user.role,
        accountId: user.accountId || undefined
    };
    // @ts-ignore
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        // @ts-ignore
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        throw new Error('Geçersiz veya süresi dolmuş token');
    }
};
exports.verifyToken = verifyToken;
