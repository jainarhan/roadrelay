import { z } from 'zod';

export type Role = 'FLEET_MANAGER' | 'DRIVER' | 'SAFETY_OFFICER' | 'FINANCIAL_ANALYST';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const vehicleStatusEnum = z.enum(['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED']);
export type VehicleStatus = z.infer<typeof vehicleStatusEnum>;

export const createVehicleSchema = z.object({
  regNumber: z.string().min(1, 'Registration number is required').toUpperCase(),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  maxLoadCapacity: z.number().positive('Max load capacity must be a positive number'),
  odometer: z.number().nonnegative('Odometer reading cannot be negative').default(0),
  acquisitionCost: z.number().positive('Acquisition cost must be a positive number'),
  status: vehicleStatusEnum.default('AVAILABLE'),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
