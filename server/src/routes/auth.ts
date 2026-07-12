import { Router } from 'express';
import { login, logout, me } from '../controllers/auth';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginSchema } from 'shared';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
