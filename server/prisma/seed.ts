import { PrismaClient, Role, VehicleStatus, DriverStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting DB seed...');

  // Clean DB in order of relations
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  console.log('Database cleaned.');

  // 1. Create Drivers
  const d1 = await prisma.driver.create({
    data: {
      name: 'John Doe',
      licenseNumber: 'LIC-001',
      licenseCategory: 'Heavy Rigid',
      licenseExpiry: new Date('2028-12-31T00:00:00Z'),
      contact: '+1234567890',
      safetyScore: 100,
      status: DriverStatus.AVAILABLE,
    },
  });

  const d2 = await prisma.driver.create({
    data: {
      name: 'Jane Smith',
      licenseNumber: 'LIC-002',
      licenseCategory: 'Light Commercial',
      licenseExpiry: new Date('2025-01-01T00:00:00Z'), // Expired license
      contact: '+1987654321',
      safetyScore: 90,
      status: DriverStatus.AVAILABLE,
    },
  });

  const d3 = await prisma.driver.create({
    data: {
      name: 'Bob Johnson',
      licenseNumber: 'LIC-003',
      licenseCategory: 'Heavy Combination',
      licenseExpiry: new Date('2029-06-30T00:00:00Z'),
      contact: '+1122334455',
      safetyScore: 45,
      status: DriverStatus.SUSPENDED, // Suspended
    },
  });

  console.log('Created Drivers:', [d1.name, d2.name, d3.name]);

  // 2. Create Users (Hashed passwords)
  const passwordHash = await bcrypt.hash('Password123', 10);

  const manager = await prisma.user.create({
    data: {
      email: 'manager@transitops.com',
      passwordHash,
      role: Role.FLEET_MANAGER,
    },
  });

  const driverUser = await prisma.user.create({
    data: {
      email: 'driver@transitops.com',
      passwordHash,
      role: Role.DRIVER,
      driverId: d1.id, // Explicitly link driver user to John Doe
    },
  });

  const safety = await prisma.user.create({
    data: {
      email: 'safety@transitops.com',
      passwordHash,
      role: Role.SAFETY_OFFICER,
    },
  });

  const finance = await prisma.user.create({
    data: {
      email: 'finance@transitops.com',
      passwordHash,
      role: Role.FINANCIAL_ANALYST,
    },
  });

  console.log('Created Users:', {
    manager: manager.email,
    driverUser: driverUser.email,
    safety: safety.email,
    finance: finance.email,
  });

  // 3. Create Vehicles
  const v1 = await prisma.vehicle.create({
    data: {
      regNumber: 'REG-001',
      name: 'Toyota Hiace',
      type: 'Van',
      maxLoadCapacity: 1500,
      acquisitionCost: 35000,
      status: VehicleStatus.AVAILABLE,
    },
  });

  const v2 = await prisma.vehicle.create({
    data: {
      regNumber: 'REG-002',
      name: 'Isuzu Elf',
      type: 'Box Truck',
      maxLoadCapacity: 4000,
      acquisitionCost: 55000,
      status: VehicleStatus.IN_SHOP,
    },
  });

  const v3 = await prisma.vehicle.create({
    data: {
      regNumber: 'REG-003',
      name: 'Volvo FH16',
      type: 'Heavy Truck',
      maxLoadCapacity: 20000,
      acquisitionCost: 120000,
      status: VehicleStatus.RETIRED,
    },
  });

  console.log('Created Vehicles:', [v1.regNumber, v2.regNumber, v3.regNumber]);
  console.log('DB seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
