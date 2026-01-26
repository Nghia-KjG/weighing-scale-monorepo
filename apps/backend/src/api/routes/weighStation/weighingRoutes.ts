// src/api/routes/weighingRoutes.ts
import express from 'express';
import { completeWeighing, reweighNhap, completeExportAll } from '../../controllers/weighStation/weighingController';

const router = express.Router();

// Định nghĩa API 'Hoàn tất'
router.post('/complete', completeWeighing);

// Định nghĩa API 'Cân lại'
router.post('/reweigh', reweighNhap);

// Định nghĩa API 'Xuất hết'
router.post('/complete-export-all', completeExportAll);

export default router;