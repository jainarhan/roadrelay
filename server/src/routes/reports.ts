import { Router } from 'express';
import {
  getFuelEfficiencyReport,
  getFleetUtilizationReport,
  getOperationalCostReport,
  getVehicleRoiReport,
} from '../controllers/reports';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Secure all reports to FLEET_MANAGER and FINANCIAL_ANALYST only
router.use(authenticate, requireRole(['FLEET_MANAGER', 'FINANCIAL_ANALYST']));

router.get('/fuel-efficiency', getFuelEfficiencyReport);
router.get('/fleet-utilization', getFleetUtilizationReport);
router.get('/operational-cost', getOperationalCostReport);
router.get('/vehicle-roi', getVehicleRoiReport);

export default router;
