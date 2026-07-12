import { Router } from 'express';
import { createDriver, getDrivers, updateDriver } from '../controllers/driver';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { createDriverSchema, updateDriverSchema } from 'shared';

const router = Router();

// Authenticated users can list/query drivers (e.g. for reports, dashboards, dropdowns)
router.get('/', authenticate, getDrivers);

// Fleet Managers and Safety Officers can create and update drivers
router.post(
  '/',
  authenticate,
  requireRole(['FLEET_MANAGER', 'SAFETY_OFFICER']),
  validateBody(createDriverSchema),
  createDriver
);

router.patch(
  '/:id',
  authenticate,
  requireRole(['FLEET_MANAGER', 'SAFETY_OFFICER']),
  validateBody(updateDriverSchema),
  updateDriver
);

export default router;
