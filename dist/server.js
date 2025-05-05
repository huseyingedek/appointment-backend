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
const app_1 = __importDefault(require("./app"));
const prisma_1 = __importDefault(require("./config/prisma"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const port = process.env.PORT || 5000;
prisma_1.default.$connect()
    .then(() => {
    console.log('Database connection established');
    app_1.default.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
})
    .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
});
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.$disconnect();
    process.exit(0);
}));
