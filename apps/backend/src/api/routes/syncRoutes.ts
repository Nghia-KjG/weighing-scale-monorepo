// src/api/routes/syncRoutes.ts
import express from 'express';
import { getUnweighedData, getPersonsData, getDevicesData } from '../controllers/syncController';

const router = express.Router();

// Định nghĩa API GET /api/sync/unweighed
router.get('/sync/unweighed', getUnweighedData);

// Định nghĩa API GET /api/sync/persons
router.get('/sync/persons', getPersonsData);

// Định nghĩa API GET /api/sync/devices
router.get('/sync/devices', getDevicesData);

export default router;