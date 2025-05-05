"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRole = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Yetkilendirme başarısız: Token bulunamadı' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decodedToken = (0, jwt_1.verifyToken)(token);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Yetkilendirme başarısız: Geçersiz token' });
        return;
    }
};
exports.authenticate = authenticate;
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Yetkilendirme başarısız' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ message: 'Bu işlem için yetkiniz bulunmamaktadır' });
            return;
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
