"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/adminRoutes.ts
const express_1 = __importDefault(require("express"));
const admin_controller_1 = require("../app/controllers/admin.controller");
const auth_middleware_1 = require("../app/middleware/auth.middleware");
const client_1 = require("@prisma/client");
const validation_middleware_1 = __importDefault(require("../app/middleware/validation.middleware"));
const router = express_1.default.Router();
const adminController = new admin_controller_1.AdminController();
// Owner oluşturma route (sadece ADMIN erişebilir)
router.post('/owners', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)([client_1.UserRole.ADMIN]), validation_middleware_1.default.validateOwnerCreation, validation_middleware_1.default.validate, adminController.createOwner.bind(adminController));
exports.default = router;
