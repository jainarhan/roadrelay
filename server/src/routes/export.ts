import { Router } from 'express';
import {
  exportVehicles,
  exportDrivers,
  exportTrips,
  exportMaintenanceLogs,
  exportFuelLogs,
  exportExpenses,
} from '../controllers/export';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Require login for all export routes
router.use(authenticate);

// Fleet Manager & Financial Analyst can export all logs
// Safety Officer can only export drivers and maintenance-logs
// Driver role has no access
router.get(
  '/vehicles',
  requireRole(['FLEET_MANAGER', 'FINANCIAL_ANALYST']),
  exportVehicles
);

router.get(
  '/drivers',
  requireRole(['FLEET_MANAGER', 'FINANCIAL_ANALYST', 'SAFETY_OFFICER']),
  exportDrivers
);

router.get(
  '/trips',
  requireRole(['FLEET_MANAGER', 'FINANCIAL_ANALYST']),
  exportTrips
);

router.get(
  '/maintenance-logs',
  requireRole(['FLEET_MANAGER', 'FINANCIAL_ANALYST', 'SAFETY_OFFICER']),
  exportMaintenanceLogs
);

router.get(
  '/fuel-logs',
  requireRole(['FLEET_MANAGER', 'FINANCIAL_ANALYST']),
  exportFuelLogs
);

router.get(
  '/expenses',
  requireRole(['FLEET_MANAGER', 'FINANCIAL_ANALYST']),
  exportExpenses
);

export default router;
