// src/api/routes/historyRoutes.ts
import express from 'express';
import { getHistory } from '../../controllers/weighStation/historyController';

const router = express.Router();

// Định nghĩa API GET /api/history
router.get('/history', getHistory);

export default router;