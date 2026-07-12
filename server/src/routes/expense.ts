import { Router } from 'express';
import { createExpense, getExpenses } from '../controllers/expense';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { createExpenseSchema } from 'shared';

const router = Router();

// Authenticated users can list expenses
router.get('/', authenticate, getExpenses);

// Fleet Managers and Financial Analysts can create expenses
router.post(
  '/',
  authenticate,
  requireRole(['FLEET_MANAGER', 'FINANCIAL_ANALYST']),
  validateBody(createExpenseSchema),
  createExpense
);

export default router;
