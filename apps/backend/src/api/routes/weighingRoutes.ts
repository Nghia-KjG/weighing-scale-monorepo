// src/api/routes/weighingRoutes.ts
import express from 'express';
import { completeWeighing, reweighNhap } from '../controllers/weighingController';

const router = express.Router();

// Định nghĩa API 'Hoàn tất'
router.post('/complete', completeWeighing);

// Định nghĩa API 'Cân lại'
router.post('/reweigh', reweighNhap);

export default router;