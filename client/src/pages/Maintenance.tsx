import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMaintenanceSchema, CreateMaintenanceInput } from 'shared';
import { api, ApiError } from '../lib/api';
import { Plus, X, CheckSquare, AlertCircle, Download } from 'lucide-react';

interface Vehicle {
  id: string;
  regNumber: string;
  name: string;
  status: string;
}

interface MaintenanceLog {
  id: string;
  vehicleId: string;
  description: string;
  active: boolean;
  openedAt: string;
  closedAt: string | null;
  vehicle: Vehicle;
}

export const Maintenance: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('ALL');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch Maintenance Logs
  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: ['maintenance', selectedVehicleFilter],
    queryFn: () => {
      const url = selectedVehicleFilter !== 'ALL'
        ? `/maintenance?vehicleId=${selectedVehicleFilter}`
        : '/maintenance';
      return api.get<{ status: string; logs: MaintenanceLog[] }>(url);
    },
  });

  // Fetch all vehicles (for filters and creation selection)
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<{ status: string; vehicles: Vehicle[] }>('/vehicles'),
  });

  const logs = logsData?.logs || [];
  const allVehicles = vehiclesData?.vehicles || [];

  // Only show vehicles with status AVAILABLE in the maintenance selection list
  const eligibleVehicles = allVehicles.filter(v => v.status === 'AVAILABLE');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Client-side filtering via useMemo
  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = log.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') {
        matchesStatus = log.active === true;
      } else if (statusFilter === 'CLOSED') {
        matchesStatus = log.active === false;
      }

      return matchesSearch && matchesStatus;
    });
  }, [logs, searchQuery, statusFilter]);

  const isFilterActive = searchQuery !== '' || statusFilter !== 'ALL' || selectedVehicleFilter !== 'ALL';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSelectedVehicleFilter('ALL');
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMaintenanceInput>({
    resolver: zodResolver(createMaintenanceSchema),
    defaultValues: {
      vehicleId: '',
      description: '',
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newLog: CreateMaintenanceInput) => api.post('/maintenance', newLog),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['report-fleet-utilization'] });
      queryClient.invalidateQueries({ queryKey: ['report-operational-cost'] });
      closeModal();
    },
    onError: (err: ApiError) => {
      setSubmitError(err.message || 'Failed to open maintenance log');
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/maintenance/${id}/close`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['report-fleet-utilization'] });
      queryClient.invalidateQueries({ queryKey: ['report-operational-cost'] });
    },
    onError: (err: ApiError) => {
      alert(err.message || 'Failed to close maintenance log');
    },
  });

  const openAddModal = () => {
    setSubmitError(null);
    reset({
      vehicleId: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSubmitError(null);
    reset();
  };

  const onSubmit = (formData: CreateMaintenanceInput) => {
    setSubmitError(null);
    createMutation.mutate(formData);
  };

  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Maintenance Logging</h1>
          <p className="mt-1 text-sm text-gray-600">Track shop repairs and check-ups for fleet assets.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open('/api/export/maintenance-logs', '_blank')}
            className="flex items-center gap-2 border border-black bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            EXPORT CSV
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            LOG MAINTENANCE
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border border-gray-300 bg-gray-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Search:</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Description..."
              className="border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-black focus:outline-none w-48"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Vehicle:</span>
            <select
              value={selectedVehicleFilter}
              onChange={(e) => setSelectedVehicleFilter(e.target.value)}
              className="border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 focus:border-black focus:outline-none"
            >
              <option value="ALL">Show All Vehicles</option>
              {allVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.regNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 focus:border-black focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (In Shop)</option>
              <option value="CLOSED">Closed (Completed)</option>
            </select>
          </div>
        </div>

        {isFilterActive && (
          <button
            onClick={clearFilters}
            className="text-xs font-bold text-gray-600 hover:text-black uppercase tracking-wider underline underline-offset-4"
          >
            Clear Filters
          </button>
        )}
      </div>

      {isLogsLoading ? (
        <div className="py-12 text-center text-gray-500 font-medium">Loading shop records...</div>
      ) : (
        <div className="border border-gray-300 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50 font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3 border-r border-gray-200">Vehicle</th>
                  <th className="px-6 py-3 border-r border-gray-200">Issue Description</th>
                  <th className="px-6 py-3 border-r border-gray-200">Opened At</th>
                  <th className="px-6 py-3 border-r border-gray-200">Closed At</th>
                  <th className="px-6 py-3 border-r border-gray-200 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 font-medium">
                      No maintenance entries found.
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 font-medium">
                      No results match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="font-semibold text-gray-900">{log.vehicle.name}</div>
                        <div className="text-xs font-mono text-gray-500 mt-0.5">{log.vehicle.regNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 border-r border-gray-200 font-medium whitespace-pre-wrap max-w-xs">{log.description}</td>
                      <td className="px-6 py-4 text-gray-600 border-r border-gray-200 text-xs">{formatDateDisplay(log.openedAt)}</td>
                      <td className="px-6 py-4 text-gray-600 border-r border-gray-200 text-xs">{formatDateDisplay(log.closedAt)}</td>
                      <td className="px-6 py-4 text-center border-r border-gray-200">
                        {log.active ? (
                          <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border border-amber-200 bg-amber-50 text-amber-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border border-green-200 bg-green-50 text-green-800">
                            Closed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {log.active ? (
                          <button
                            onClick={() => closeMutation.mutate(log.id)}
                            className="inline-flex items-center gap-1 border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            <CheckSquare className="h-3 w-3" />
                            CLOSE LOG
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 font-medium italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="w-full max-w-md border border-gray-300 bg-white p-6 shadow-md relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">Log Vehicle Maintenance</h2>
              <p className="text-xs text-gray-500 mt-1">Place an asset in shop repairs. This sets vehicle status to IN_SHOP.</p>
            </div>

            {submitError && (
              <div className="mb-4 border border-red-200 bg-red-50 p-3 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                  Select Vehicle
                </label>
                <select
                  {...register('vehicleId')}
                  className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
                >
                  <option value="">Choose vehicle...</option>
                  {eligibleVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.regNumber}) - Status: {v.status}
                    </option>
                  ))}
                </select>
                {errors.vehicleId && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {errors.vehicleId.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                  Issue / Repair Description
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  placeholder="Describe details of mechanical issues, check-ups, or repairs..."
                  className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none resize-none"
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {errors.description.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  OPEN REPAIR LOG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Maintenance;
