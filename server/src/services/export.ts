import { prisma } from '../prisma';

export function convertToCSV(data: Record<string, any>[], headers: string[], keys: string[]): string {
  const escapeValue = (val: any) => {
    if (val === null || val === undefined) return '';
    let str: string;
    if (val instanceof Date) {
      str = val.toISOString();
    } else if (typeof val === 'object' && typeof val.toNumber === 'function') {
      // Prisma Decimal
      str = val.toString();
    } else if (typeof val === 'object') {
      str = JSON.stringify(val);
    } else {
      str = String(val);
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = keys.map((key) => {
      if (key.includes('.')) {
        const parts = key.split('.');
        let val: any = row;
        for (const part of parts) {
          val = val?.[part];
        }
        return escapeValue(val);
      }
      return escapeValue(row[key]);
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\r\n');
}

export async function exportVehiclesCSV() {
  const data = await prisma.vehicle.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const headers = [
    'ID',
    'Registration Number',
    'Name',
    'Type',
    'Max Load Capacity (kg)',
    'Odometer (km)',
    'Acquisition Cost ($)',
    'Status',
    'Created At',
  ];
  const keys = [
    'id',
    'regNumber',
    'name',
    'type',
    'maxLoadCapacity',
    'odometer',
    'acquisitionCost',
    'status',
    'createdAt',
  ];
  return convertToCSV(data, headers, keys);
}

export async function exportDriversCSV() {
  const data = await prisma.driver.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const headers = [
    'ID',
    'Name',
    'License Number',
    'License Category',
    'License Expiry',
    'Contact',
    'Safety Score',
    'Status',
    'Created At',
  ];
  const keys = [
    'id',
    'name',
    'licenseNumber',
    'licenseCategory',
    'licenseExpiry',
    'contact',
    'safetyScore',
    'status',
    'createdAt',
  ];
  return convertToCSV(data, headers, keys);
}

export async function exportTripsCSV() {
  const data = await prisma.trip.findMany({
    include: {
      vehicle: { select: { regNumber: true } },
      driver: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const headers = [
    'Trip ID',
    'Source',
    'Destination',
    'Cargo Weight (kg)',
    'Planned Distance (km)',
    'Odometer End (km)',
    'Revenue ($)',
    'Status',
    'Dispatched At',
    'Completed At',
    'Created At',
    'Vehicle Reg Number',
    'Driver Name',
  ];
  const keys = [
    'id',
    'source',
    'destination',
    'cargoWeight',
    'plannedDistance',
    'odometerEnd',
    'revenue',
    'status',
    'dispatchedAt',
    'completedAt',
    'createdAt',
    'vehicle.regNumber',
    'driver.name',
  ];
  return convertToCSV(data, headers, keys);
}

export async function exportMaintenanceLogsCSV() {
  const data = await prisma.maintenanceLog.findMany({
    include: {
      vehicle: { select: { regNumber: true } },
    },
    orderBy: { openedAt: 'desc' },
  });
  const headers = [
    'Log ID',
    'Vehicle Reg Number',
    'Description',
    'Cost ($)',
    'Active',
    'Opened At',
    'Closed At',
  ];
  const keys = [
    'id',
    'vehicle.regNumber',
    'description',
    'cost',
    'active',
    'openedAt',
    'closedAt',
  ];
  return convertToCSV(data, headers, keys);
}

export async function exportFuelLogsCSV() {
  const data = await prisma.fuelLog.findMany({
    include: {
      vehicle: { select: { regNumber: true } },
    },
    orderBy: { date: 'desc' },
  });
  const headers = [
    'Fuel Log ID',
    'Vehicle Reg Number',
    'Associated Trip ID',
    'Liters (L)',
    'Cost ($)',
    'Date',
  ];
  const keys = ['id', 'vehicle.regNumber', 'tripId', 'liters', 'cost', 'date'];
  return convertToCSV(data, headers, keys);
}

export async function exportExpensesCSV() {
  const data = await prisma.expense.findMany({
    include: {
      vehicle: { select: { regNumber: true } },
    },
    orderBy: { date: 'desc' },
  });
  const headers = [
    'Expense ID',
    'Vehicle Reg Number',
    'Type',
    'Amount ($)',
    'Date',
  ];
  const keys = ['id', 'vehicle.regNumber', 'type', 'amount', 'date'];
  return convertToCSV(data, headers, keys);
}
