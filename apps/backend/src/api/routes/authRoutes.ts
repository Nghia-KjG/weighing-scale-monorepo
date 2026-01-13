import express from 'express';
import { login, checkRole } from '../controllers/authController';

const router = express.Router();

// Định nghĩa API POST /api/auth/login
router.post('/login', login);

// Định nghĩa API POST /api/auth/check-role
router.post('/check-role', checkRole);

export default router;