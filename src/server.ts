import app from './app';
import prisma from './config/prisma';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 5000;

prisma.$connect()
  .then(() => {
    console.log('Database connection established');
    
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
