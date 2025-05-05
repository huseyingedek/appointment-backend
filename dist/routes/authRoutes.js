"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/authRoutes.ts
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../app/controllers/auth.controller");
const auth_middleware_1 = require("../app/middleware/auth.middleware");
const validation_middleware_1 = __importDefault(require("../app/middleware/validation.middleware"));
const router = express_1.default.Router();
const authController = new auth_controller_1.AuthController();
// Login route
router.post('/login', validation_middleware_1.default.validateLogin, validation_middleware_1.default.validate, authController.login.bind(authController));
// Giriş yapmış kullanıcı bilgilerini getirme
router.get('/me', auth_middleware_1.authenticate, authController.getCurrentUser.bind(authController));
exports.default = router;
