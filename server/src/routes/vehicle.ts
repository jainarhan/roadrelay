import { Router } from 'express';
import { createVehicle, getVehicles, updateVehicle, retireVehicle } from '../controllers/vehicle';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { createVehicleSchema, updateVehicleSchema } from 'shared';

const router = Router();

// Everyone who is authenticated can view/list vehicles (needed for dashboard, dropdowns)
router.get('/', authenticate, getVehicles);

// Only FLEET_MANAGER can create or update vehicles
router.post('/', authenticate, requireRole(['FLEET_MANAGER']), validateBody(createVehicleSchema), createVehicle);
router.patch('/:id', authenticate, requireRole(['FLEET_MANAGER']), validateBody(updateVehicleSchema), updateVehicle);
router.post('/:id/retire', authenticate, requireRole(['FLEET_MANAGER']), retireVehicle);

export default router;
