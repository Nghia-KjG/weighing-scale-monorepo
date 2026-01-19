// src/api/routes/syncRoutes.ts
import express from 'express';
import { getUnweighedSummary, getUnweighedDetails } from '../../controllers/weighStation/unweighedController';

const router = express.Router();

// Định nghĩa API GET /api//unweighed/summary
router.get('/unweighed/summary', getUnweighedSummary);

router.get('/unweighed/details/:ovno', getUnweighedDetails);

export default router;