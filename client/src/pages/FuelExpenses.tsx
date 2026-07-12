import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFuelLogSchema, createExpenseSchema, CreateFuelLogInput, CreateExpenseInput } from 'shared';
import { api, ApiError } from '../lib/api';
import { Plus, X, AlertCircle, Download } from 'lucide-react';

interface Vehicle {
  id: string;
  regNumber: string;
  name: string;
  status: string;
}

interface Trip {
  id: string;
  source: string;
  destination: string;
  createdAt: string;
}

interface FuelLog {
  id: string;
  vehicleId: string;
  tripId: string | null;
  liters: number;
  cost: number;
  date: string;
  vehicle: Vehicle;
  trip: Trip | null;
}

interface Expense {
  id: string;
  vehicleId: string;
  type: string;
  amount: number;
  date: string;
  vehicle: Vehicle;
}

export const FuelExpenses: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'fuel' | 'expenses'>('fuel');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('ALL');

  // Modals state
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Queries
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<{ status: string; vehicles: Vehicle[] }>('/vehicles'),
  });

  const { data: tripsData } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.get<{ status: string; trips: Trip[] }>('/trips'),
  });

  const { data: fuelLogsData, isLoading: isFuelLoading } = useQuery({
    queryKey: ['fuel-logs', selectedVehicleFilter],
    queryFn: () => {
      const url = selectedVehicleFilter !== 'ALL'
        ? `/fuel-logs?vehicleId=${selectedVehicleFilter}`
        : '/fuel-logs';
      return api.get<{ status: string; fuelLogs: FuelLog[] }>(url);
    },
  });

  const { data: expensesData, isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenses', selectedVehicleFilter],
    queryFn: () => {
      const url = selectedVehicleFilter !== 'ALL'
        ? `/expenses?vehicleId=${selectedVehicleFilter}`
        : '/expenses';
      return api.get<{ status: string; expenses: Expense[] }>(url);
    },
  });

  const vehicles = vehiclesData?.vehicles || [];
  const trips = tripsData?.trips || [];
  const fuelLogs = fuelLogsData?.fuelLogs || [];
  const expenses = expensesData?.expenses || [];

  // Date Range Filter States
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  // Client-side filtering via useMemo for Fuel Logs
  const filteredFuelLogs = React.useMemo(() => {
    return fuelLogs.filter((log) => {
      if (!log.date) return true;
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);

      if (fromDateFilter) {
        const fromDate = new Date(fromDateFilter);
        fromDate.setHours(0, 0, 0, 0);
        if (logDate < fromDate) return false;
      }

      if (toDateFilter) {
        const toDate = new Date(toDateFilter);
        toDate.setHours(0, 0, 0, 0);
        if (logDate > toDate) return false;
      }

      return true;
    });
  }, [fuelLogs, fromDateFilter, toDateFilter]);

  // Client-side filtering via useMemo for Expenses
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp.date) return true;
      const expDate = new Date(exp.date);
      expDate.setHours(0, 0, 0, 0);

      if (fromDateFilter) {
        const fromDate = new Date(fromDateFilter);
        fromDate.setHours(0, 0, 0, 0);
        if (expDate < fromDate) return false;
      }

      if (toDateFilter) {
        const toDate = new Date(toDateFilter);
        toDate.setHours(0, 0, 0, 0);
        if (expDate > toDate) return false;
      }

      return true;
    });
  }, [expenses, fromDateFilter, toDateFilter]);

  const isFilterActive = selectedVehicleFilter !== 'ALL' || fromDateFilter !== '' || toDateFilter !== '';

  const clearFilters = () => {
    setSelectedVehicleFilter('ALL');
    setFromDateFilter('');
    setToDateFilter('');
  };

  // React Hook Forms
  const fuelForm = useForm<any>({
    resolver: zodResolver(createFuelLogSchema),
    defaultValues: {
      vehicleId: '',
      tripId: '',
      liters: 0,
      cost: 0,
      date: new Date().toISOString().split('T')[0],
    },
  });

  const expenseForm = useForm<any>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      vehicleId: '',
      type: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    },
  });

  // Mutations
  const createFuelMutation = useMutation({
    mutationFn: (newFuel: CreateFuelLogInput) => api.post('/fuel-logs', newFuel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
      queryClient.invalidateQueries({ queryKey: ['report-fuel-efficiency'] });
      queryClient.invalidateQueries({ queryKey: ['report-vehicle-roi'] });
      closeFuelModal();
    },
    onError: (err: ApiError) => {
      setSubmitError(err.message || 'Failed to log fuel entry');
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (newExpense: CreateExpenseInput) => api.post('/expenses', newExpense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['report-operational-cost'] });
      queryClient.invalidateQueries({ queryKey: ['report-vehicle-roi'] });
      closeExpenseModal();
    },
    onError: (err: ApiError) => {
      setSubmitError(err.message || 'Failed to log expense entry');
    },
  });

  const openFuelModal = () => {
    setSubmitError(null);
    fuelForm.reset({
      vehicleId: '',
      tripId: '',
      liters: undefined,
      cost: undefined,
      date: new Date().toISOString().split('T')[0],
    });
    setIsFuelModalOpen(true);
  };

  const closeFuelModal = () => {
    setIsFuelModalOpen(false);
    setSubmitError(null);
    fuelForm.reset();
  };

  const openExpenseModal = () => {
    setSubmitError(null);
    expenseForm.reset({
      vehicleId: '',
      type: '',
      amount: undefined,
      date: new Date().toISOString().split('T')[0],
    });
    setIsExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setSubmitError(null);
    expenseForm.reset();
  };

  const onFuelSubmit = (data: any) => {
    setSubmitError(null);
    // Convert empty string tripId to null for schema
    const payload = {
      ...data,
      tripId: data.tripId || null,
    };
    createFuelMutation.mutate(payload);
  };

  const onExpenseSubmit = (data: any) => {
    setSubmitError(null);
    createExpenseMutation.mutate(data);
  };

  const formatDateDisplay = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Fuel & Expenses</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Log refuels and general operational expenditures.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={() => window.open(activeTab === 'fuel' ? '/api/export/fuel-logs' : '/api/export/expenses', '_blank')}
            className="flex items-center gap-2 border border-black dark:border-white bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4" />
            {activeTab === 'fuel' ? 'EXPORT FUEL' : 'EXPORT EXPENSES'}
          </button>
          <button
            onClick={openFuelModal}
            className="flex items-center gap-2 bg-black dark:bg-white px-3 py-2 text-sm font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
            LOG FUEL
          </button>
          <button
            onClick={openExpenseModal}
            className="flex items-center gap-2 bg-black dark:bg-white px-3 py-2 text-sm font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
            LOG EXPENSE
          </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-300 dark:border-gray-700 gap-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('fuel')}
            className={`pb-2.5 text-sm font-bold border-b-2 tracking-wide uppercase ${
              activeTab === 'fuel' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Fuel Logs
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-2.5 text-sm font-bold border-b-2 tracking-wide uppercase ${
              activeTab === 'expenses' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            General Expenses
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Vehicle:</span>
            <select
              value={selectedVehicleFilter}
              onChange={(e) => setSelectedVehicleFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-250 focus:border-black dark:focus:border-white focus:outline-none"
            >
              <option value="ALL">Show All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.regNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">From Date:</span>
            <input
              type="date"
              value={fromDateFilter}
              onChange={(e) => setFromDateFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">To Date:</span>
            <input
              type="date"
              value={toDateFilter}
              onChange={(e) => setToDateFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
            />
          </div>
        </div>

        {isFilterActive && (
          <button
            onClick={clearFilters}
            className="text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white uppercase tracking-wider underline underline-offset-4"
          >
            Clear Filters
          </button>
        )}
      </div>

      {activeTab === 'fuel' ? (
        isFuelLoading ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400 font-medium">Loading fuel records...</div>
        ) : (
          <div className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Vehicle</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Trip</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">Liters</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">Cost</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {fuelLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                        No fuel logs found.
                      </td>
                    </tr>
                  ) : filteredFuelLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                        No results match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredFuelLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-gray-100">
                          <div>{log.vehicle.name}</div>
                          <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{log.vehicle.regNumber}</div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                          {log.trip ? (
                            <div>
                              <div className="font-semibold text-xs text-gray-600 dark:text-gray-450">ID: {log.trip.id.substring(0, 8)}...</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{log.trip.source} &rarr; {log.trip.destination}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right text-gray-900 dark:text-gray-100 font-medium">{log.liters.toLocaleString()} L</td>
                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right text-gray-900 dark:text-gray-100 font-bold">${log.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{formatDateDisplay(log.date)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : isExpensesLoading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400 font-medium">Loading expense records...</div>
      ) : (
        <div className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Vehicle</th>
                  <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Expense Type</th>
                  <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">Amount</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                      No expense records found.
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                      No results match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-gray-100">
                        <div>{expense.vehicle.name}</div>
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{expense.vehicle.regNumber}</div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-bold uppercase tracking-wider text-xs">
                        <span className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-sm">
                          {expense.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right text-gray-900 dark:text-gray-100 font-bold">${expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{formatDateDisplay(expense.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FUEL LOG MODAL */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-opacity-60 p-4">
          <div className="w-full max-w-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-md relative">
            <button
              onClick={closeFuelModal}
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Log Fuel Entry</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter fuel consumption for fleet operations.</p>
            </div>

            {submitError && (
              <div className="mb-4 border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={fuelForm.handleSubmit(onFuelSubmit)} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Select Vehicle
                </label>
                <select
                  {...fuelForm.register('vehicleId')}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                >
                  <option value="">Choose vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.regNumber})
                    </option>
                  ))}
                </select>
                {fuelForm.formState.errors.vehicleId && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {fuelForm.formState.errors.vehicleId.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Associated Trip (Optional)
                </label>
                <select
                  {...fuelForm.register('tripId')}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                >
                  <option value="">None</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      Trip ID: {t.id.substring(0, 8)}... ({t.source} &rarr; {t.destination})
                    </option>
                  ))}
                </select>
                {fuelForm.formState.errors.tripId && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {fuelForm.formState.errors.tripId.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Liters
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...fuelForm.register('liters', { valueAsNumber: true })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                  />
                  {fuelForm.formState.errors.liters && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {fuelForm.formState.errors.liters.message as React.ReactNode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...fuelForm.register('cost', { valueAsNumber: true })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                  />
                  {fuelForm.formState.errors.cost && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {fuelForm.formState.errors.cost.message as React.ReactNode}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Date
                </label>
                <input
                  type="date"
                  {...fuelForm.register('date')}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                />
                {fuelForm.formState.errors.date && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {fuelForm.formState.errors.date.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeFuelModal}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-black dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100"
                >
                  SAVE FUEL LOG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPENSE LOG MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-opacity-60 p-4">
          <div className="w-full max-w-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-md relative">
            <button
              onClick={closeExpenseModal}
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Log General Expense</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Record non-fuel expenditures like tolls, permit fees, or insurance.</p>
            </div>

            {submitError && (
              <div className="mb-4 border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Select Vehicle
                </label>
                <select
                  {...expenseForm.register('vehicleId')}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                >
                  <option value="">Choose vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.regNumber})
                    </option>
                  ))}
                </select>
                {expenseForm.formState.errors.vehicleId && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {expenseForm.formState.errors.vehicleId.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Expense Type
                </label>
                <select
                  {...expenseForm.register('type')}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                >
                  <option value="">Select type...</option>
                  <option value="TOLL">TOLL</option>
                  <option value="INSURANCE">INSURANCE</option>
                  <option value="PERMIT">PERMIT</option>
                  <option value="MISC">MISC</option>
                </select>
                {expenseForm.formState.errors.type && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {expenseForm.formState.errors.type.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...expenseForm.register('amount', { valueAsNumber: true })}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                />
                {expenseForm.formState.errors.amount && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {expenseForm.formState.errors.amount.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Date
                </label>
                <input
                  type="date"
                  {...expenseForm.register('date')}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                />
                {expenseForm.formState.errors.date && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {expenseForm.formState.errors.date.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeExpenseModal}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-black dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100"
                >
                  SAVE EXPENSE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default FuelExpenses;
