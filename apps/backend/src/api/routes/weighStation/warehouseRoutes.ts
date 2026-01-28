// apps/backend/src/api/routes/weighStation/warehouseRoutes.ts
import { Router } from 'express';
import { getWarehouseSummary, getWarehouseDetails } from '../../controllers/weighStation/warehouseController';

const router = Router();

// GET /api/warehouse/summary - Lấy tóm tắt tồn kho theo OVNO
router.get('/warehouse/summary', getWarehouseSummary);

// GET /api/warehouse/details/:ovno - Lấy chi tiết tất cả mã code của một OVNO
router.get('/warehouse/details/:ovno', getWarehouseDetails);

export default router;
