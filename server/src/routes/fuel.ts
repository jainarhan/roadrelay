import { Router } from 'express';
import { createFuelLog, getFuelLogs } from '../controllers/fuel';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { createFuelLogSchema } from 'shared';

const router = Router();

// Authenticated users can list fuel logs
router.get('/', authenticate, getFuelLogs);

// Fleet Managers and Financial Analysts can create fuel logs
router.post(
  '/',
  authenticate,
  requireRole(['FLEET_MANAGER', 'FINANCIAL_ANALYST']),
  validateBody(createFuelLogSchema),
  createFuelLog
);

export default router;
