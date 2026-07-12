import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import vehicleRoutes from './routes/vehicle';
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

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;
