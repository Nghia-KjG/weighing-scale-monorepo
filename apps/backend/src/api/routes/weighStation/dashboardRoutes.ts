// apps/backend/src/api/routes/dashboardRoutes.ts
import express from 'express';
import { 
  getInventorySummary, 
  getShiftWeighing, 
  getWeighingTrend 
} from '../../controllers/weighStation/dashboardController';

const router = express.Router();

// GET /api/dashboard/inventory-summary - Lấy tổng quan tồn kho
router.get('/dashboard/inventory-summary', getInventorySummary);

// GET /api/dashboard/hourly-weighing - Lấy dữ liệu cân theo giờ
router.get('/dashboard/shift-weighing', getShiftWeighing);

// GET /api/dashboard/weighing-trend - Lấy xu hướng cân theo tháng
router.get('/dashboard/weighing-trend', getWeighingTrend);

export default router;