import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import metaRoutes from './routes/metaRoutes';
import metadataRoutes from './routes/metadataRoutes';
import transactionRoutes from './routes/transactionRoutes';
import workflowRoutes from './routes/workflowRoutes';
import authRoutes from './routes/authRoutes';
import configRoutes from './routes/configRoutes';
import masterDataRoutes from './routes/masterDataRoutes';
import itemAccountRoutes from './routes/itemAccountRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Auth routes (no auth required)
app.use('/api/auth', authRoutes);

// Apply auth middleware to all other routes
// app.use('/api', AuthMiddleware.authenticate);
// app.use('/api', AuthMiddleware.companyIsolation);

// Routes setup
app.use('/api/masters', masterDataRoutes);
app.use('/api/masters', itemAccountRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/txn', transactionRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/config', configRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'mErp Service is running!' });
});

app.listen(port, () => {
  console.log(`mErp Service running on port ${port}`);
});
