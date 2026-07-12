import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import vehicleRoutes from './routes/vehicle';
import driverRoutes from './routes/driver';
import tripRoutes from './routes/trip';
import maintenanceRoutes from './routes/maintenance';
import fuelRoutes from './routes/fuel';
import expenseRoutes from './routes/expense';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';
import exportRoutes from './routes/export';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Configure CORS as strictly requested by the user
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Base health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes under /api namespace
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel-logs', fuelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;
