import { z } from 'zod';

export type Role = 'FLEET_MANAGER' | 'DRIVER' | 'SAFETY_OFFICER' | 'FINANCIAL_ANALYST';

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(72, 'Password cannot exceed 72 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*[0-9])/, 'Password must contain at least one letter and one number'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const vehicleStatusEnum = z.enum(['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED']);
export type VehicleStatus = z.infer<typeof vehicleStatusEnum>;

export const createVehicleSchema = z.object({
  regNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Registration number is required')
    .max(20, 'Registration number cannot exceed 20 characters')
    .regex(/^[A-Z0-9-]+$/, 'Registration number must contain only uppercase letters, numbers, and hyphens'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  type: z.string().trim().min(1, 'Type is required').max(100, 'Type cannot exceed 100 characters'),
  maxLoadCapacity: z
    .number()
    .positive('Max load capacity must be a positive number')
    .max(100000, 'Max load capacity cannot exceed 100,000 kg'),
  odometer: z
    .number()
    .nonnegative('Odometer reading cannot be negative')
    .max(10000000, 'Odometer reading cannot exceed 10,000,000 km')
    .default(0),
  acquisitionCost: z
    .number()
    .positive('Acquisition cost must be a positive number')
    .max(100000000, 'Acquisition cost cannot exceed 100,000,000'),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const driverStatusEnum = z.enum(['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED']);
export type DriverStatus = z.infer<typeof driverStatusEnum>;

export const createDriverSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  licenseNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'License number is required')
    .max(20, 'License number cannot exceed 20 characters')
    .regex(/^[A-Z0-9-]+$/, 'License number must contain only uppercase letters, numbers, and hyphens'),
  licenseCategory: z
    .string()
    .trim()
    .min(1, 'License category is required')
    .max(100, 'License category cannot exceed 100 characters'),
  licenseExpiry: z.coerce.date({ required_error: 'License expiry date is required' }),
  contact: z
    .string()
    .trim()
    .min(1, 'Contact number is required')
    .max(20, 'Contact number cannot exceed 20 characters')
    .regex(/^[0-9+\-\s]{7,15}$/, 'Contact number must be a valid phone number (7-15 digits, spaces, hyphens, +)'),
  safetyScore: z
    .number()
    .min(0, 'Safety score cannot be negative')
    .max(100, 'Safety score cannot exceed 100')
    .default(100),
  status: driverStatusEnum.default('AVAILABLE'),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;

export const updateDriverSchema = createDriverSchema.partial();
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;

export const tripStatusEnum = z.enum(['DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED']);
export type TripStatus = z.infer<typeof tripStatusEnum>;

export const createTripSchema = z.object({
  source: z.string().trim().min(1, 'Source location is required').max(100, 'Source location cannot exceed 100 characters'),
  destination: z.string().trim().min(1, 'Destination is required').max(100, 'Destination cannot exceed 100 characters'),
  vehicleId: z.string().uuid('Invalid vehicle selection'),
  driverId: z.string().uuid('Invalid driver selection'),
  cargoWeight: z.number().positive('Cargo weight must be a positive number').max(100000, 'Cargo weight cannot exceed 100,000 kg'),
  plannedDistance: z.number().positive('Planned distance must be a positive number').max(10000, 'Planned distance cannot exceed 10,000 km'),
  revenue: z.number().positive('Revenue must be positive').max(100000000, 'Revenue cannot exceed $100,000,000').optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;

export const completeTripSchema = z.object({
  odometerEnd: z.number().positive('Odometer reading must be a positive number').max(10000000, 'Odometer reading cannot exceed 10,000,000 km'),
  revenue: z.number().positive('Revenue must be positive').max(100000000, 'Revenue cannot exceed $100,000,000').optional(),
});

export type CompleteTripInput = z.infer<typeof completeTripSchema>;

export const createMaintenanceSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle selection'),
  description: z.string().trim().min(1, 'Description is required').max(500, 'Description cannot exceed 500 characters'),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;

export const createFuelLogSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle selection'),
  tripId: z.string().uuid('Invalid trip selection').optional().nullable(),
  liters: z.number().positive('Liters must be positive').max(10000, 'Liters cannot exceed 10,000 liters'),
  cost: z.number().positive('Cost must be positive').max(10000000, 'Cost cannot exceed $10,000,000'),
  date: z.string().optional().transform((val) => val ? new Date(val) : new Date()),
});

export type CreateFuelLogInput = z.infer<typeof createFuelLogSchema>;

export const createExpenseSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle selection'),
  type: z.string().trim().min(1, 'Expense type is required').max(100, 'Expense type cannot exceed 100 characters'),
  amount: z.number().positive('Amount must be positive').max(10000000, 'Amount cannot exceed $10,000,000'),
  date: z.string().optional().transform((val) => val ? new Date(val) : new Date()),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
