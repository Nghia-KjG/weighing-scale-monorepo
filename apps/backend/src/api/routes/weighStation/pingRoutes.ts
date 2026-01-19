import express from 'express';
import { ping } from '../../controllers/weighStation/pingController';

const router = express.Router();

router.get('/ping', ping);

export default router;
