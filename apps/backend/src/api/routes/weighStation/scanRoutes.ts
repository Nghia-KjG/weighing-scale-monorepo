// src/api/routes/scanRoutes.ts
import express from 'express';
import { getScanData } from '../../controllers/weighStation/scanController';

const router = express.Router();

// GET /api/scan/:maCode
router.get('/scan/:maCode', getScanData);

export default router; // Export the router