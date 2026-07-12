import { Router } from 'express';
import {
  createTrip,
  getTrips,
  dispatchTrip,
  completeTrip,
  cancelTrip,
} from '../controllers/trip';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { createTripSchema, completeTripSchema } from 'shared';

const router = Router();

// All authenticated users can view/list trips
router.get('/', authenticate, getTrips);

// Trip mutations are strictly restricted to FLEET_MANAGER
router.post(
  '/',
  authenticate,
  requireRole(['FLEET_MANAGER']),
  validateBody(createTripSchema),
  createTrip
);

router.post(
  '/:id/dispatch',
  authenticate,
  requireRole(['FLEET_MANAGER']),
  dispatchTrip
);

router.post(
  '/:id/complete',
  authenticate,
  requireRole(['FLEET_MANAGER']),
  validateBody(completeTripSchema),
  completeTrip
);

router.post(
  '/:id/cancel',
  authenticate,
  requireRole(['FLEET_MANAGER']),
  cancelTrip
);

export default router;
