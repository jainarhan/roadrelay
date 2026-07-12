import { Router } from 'express';
import {
  createMaintenanceLog,
  getMaintenanceLogs,
  closeMaintenanceLog,
} from '../controllers/maintenance';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { createMaintenanceSchema } from 'shared';

const router = Router();

// Everyone who is authenticated can view/list maintenance logs
router.get('/', authenticate, getMaintenanceLogs);

// Fleet Managers and Safety Officers can create and close maintenance logs
router.post(
  '/',
  authenticate,
  requireRole(['FLEET_MANAGER', 'SAFETY_OFFICER']),
  validateBody(createMaintenanceSchema),
  createMaintenanceLog
);

router.post(
  '/:id/close',
  authenticate,
  requireRole(['FLEET_MANAGER', 'SAFETY_OFFICER']),
  closeMaintenanceLog
);

export default router;
