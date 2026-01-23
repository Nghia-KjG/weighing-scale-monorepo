import express from 'express';
import { checkAppVersion, downloadLatestApk } from '../../controllers/weighStation/appUpdateController';

const router = express.Router();

router.get('/app-update/check', checkAppVersion);
router.get('/app-update/download', downloadLatestApk);

export default router;
