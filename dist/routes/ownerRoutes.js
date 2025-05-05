"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/ownerRoutes.ts
const express_1 = __importDefault(require("express"));
const owner_controller_1 = require("../app/controllers/owner.controller");
const auth_middleware_1 = require("../app/middleware/auth.middleware");
const client_1 = require("@prisma/client");
const validation_middleware_1 = __importDefault(require("../app/middleware/validation.middleware"));
const router = express_1.default.Router();
const ownerController = new owner_controller_1.OwnerController();
// Personel oluşturma route (sadece OWNER erişebilir)
router.post('/employees', auth_middleware_1.authenticate, 
// @ts-ignore - Prisma enum değişiklikleri
(0, auth_middleware_1.authorizeRole)([client_1.UserRole.OWNER]), validation_middleware_1.default.validateEmployeeCreation, validation_middleware_1.default.validate, ownerController.createEmployee.bind(ownerController));
exports.default = router;
