import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard';
import { authenticate } from '../middleware/auth';

const router = Router();

// Dashboard can be read by all authenticated roles
router.get('/summary', authenticate, getDashboardSummary);

export default router;
