import express, { Application } from 'express';
import cors from 'cors';
import router from './routes';
import { errorHandler } from './app/utils/error.util';

const app: Application = express();

app.use(cors({
  origin: ['https://appointment-frontend-seven.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

app.use('/api', router);

app.use(errorHandler);
 
export default app;