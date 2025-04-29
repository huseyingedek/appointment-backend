import express, { Application } from 'express';
import cors from 'cors';
import router from './routes';

const app: Application = express();

app.use(cors());

app.use(express.json({ limit: '50mb' }));

app.use('/api', router);
 
export default app;