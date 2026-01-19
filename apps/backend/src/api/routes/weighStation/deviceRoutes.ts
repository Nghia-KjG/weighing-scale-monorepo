import express from 'express';
import { getDevicesData, createDevice, updateDevice, deleteDevice } from '../../controllers/weighStation/deviceController';

const router = express.Router();

// Định nghĩa API GET /api/devices
// Giữ nguyên path /sync/devices để tương thích front-end hiện tại
router.get('/devices', getDevicesData);

// CRUD Devices
router.post('/devices', createDevice);
router.put('/devices/:stt', updateDevice);
router.delete('/devices/:stt', deleteDevice);

export default router;
