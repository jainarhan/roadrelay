import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTripSchema, completeTripSchema, CreateTripInput, CompleteTripInput, TripStatus } from 'shared';
import { api, ApiError } from '../lib/api';
import { Plus, Check, Play, XCircle, X, Download } from 'lucide-react';

interface Vehicle {
  id: string;
  regNumber: string;
  name: string;
  odometer: number;
}

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
}

interface Trip {
  id: string;
  source: string;
  destination: string;
  cargoWeight: number;
  plannedDistance: number;
  revenue: number | null;
  status: TripStatus;
  dispatchedAt: string | null;
  completedAt: string | null;
  odometerEnd: number | null;
  createdAt: string;
  vehicle: Vehicle;
  driver: Driver;
}

export const Trips: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [completingTrip, setCompletingTrip] = useState<Trip | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch Trips
  const { data: tripsData, isLoading: isTripsLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.get<{ status: string; trips: Trip[] }>('/trips'),
  });

  // Fetch Dispatchable Vehicles (for creation dropdown)
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', 'dispatchable'],
    queryFn: () => api.get<{ status: string; vehicles: Vehicle[] }>('/vehicles?dispatchable=true'),
    enabled: isCreateModalOpen,
  });

  // Fetch Dispatchable Drivers (for creation dropdown)
  const { data: driversData } = useQuery({
    queryKey: ['drivers', 'dispatchable'],
    queryFn: () => api.get<{ status: string; drivers: Driver[] }>('/drivers?dispatchable=true'),
    enabled: isCreateModalOpen,
  });

  const trips = tripsData?.trips || [];
  const dispatchableVehicles = vehiclesData?.vehicles || [];
  const dispatchableDrivers = driversData?.drivers || [];

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Client-side filtering via useMemo
  const filteredTrips = React.useMemo(() => {
    return trips.filter((t) => {
      const matchesSearch =
        t.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.destination.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [trips, searchQuery, statusFilter]);

  const isFilterActive = searchQuery !== '' || statusFilter !== 'ALL';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
  };

  // Create Form Config
  const createForm = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      source: '',
      destination: '',
      vehicleId: '',
      driverId: '',
      cargoWeight: 0,
      plannedDistance: 0,
      revenue: undefined,
    },
  });

  // Complete Form Config
  const completeForm = useForm<CompleteTripInput>({
    resolver: zodResolver(completeTripSchema),
    defaultValues: {
      odometerEnd: 0,
      revenue: undefined,
    },
  });

  // Create Trip Mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateTripInput) => api.post('/trips', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      closeCreateModal();
    },
    onError: (err: ApiError) => {
      setActionError(err.message || 'Failed to schedule trip');
    },
  });

  // Dispatch Mutation
  const dispatchMutation = useMutation({
    mutationFn: (id: string) => api.post(`/trips/${id}/dispatch`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: ApiError) => {
      alert(err.message || 'Failed to dispatch trip');
    },
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/trips/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: ApiError) => {
      alert(err.message || 'Failed to cancel trip');
    },
  });

  // Complete Mutation
  const completeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteTripInput }) =>
      api.post(`/trips/${id}/complete`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['report-fuel-efficiency'] });
      queryClient.invalidateQueries({ queryKey: ['report-fleet-utilization'] });
      queryClient.invalidateQueries({ queryKey: ['report-operational-cost'] });
      queryClient.invalidateQueries({ queryKey: ['report-vehicle-roi'] });
      closeCompleteModal();
    },
    onError: (err: ApiError) => {
      setActionError(err.message || 'Failed to complete trip');
    },
  });

  const openCreateModal = () => {
    setActionError(null);
    createForm.reset({
      source: '',
      destination: '',
      vehicleId: '',
      driverId: '',
      cargoWeight: undefined,
      plannedDistance: undefined,
      revenue: undefined,
    });
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setActionError(null);
    createForm.reset();
  };

  const openCompleteModal = (trip: Trip) => {
    setCompletingTrip(trip);
    setActionError(null);
    completeForm.reset({
      odometerEnd: trip.vehicle.odometer, // Prefill with current odometer
      revenue: trip.revenue || undefined,
    });
  };

  const closeCompleteModal = () => {
    setCompletingTrip(null);
    setActionError(null);
    completeForm.reset();
  };

  const handleCreateSubmit = (data: CreateTripInput) => {
    setActionError(null);
    createMutation.mutate(data);
  };

  const handleCompleteSubmit = (data: CompleteTripInput) => {
    if (!completingTrip) return;
    setActionError(null);
    completeMutation.mutate({ id: completingTrip.id, data });
  };

  const getStatusBadge = (status: TripStatus) => {
    const base = "px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border ";
    switch (status) {
      case 'DRAFT':
        return <span className={`${base} bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-450 border-gray-200 dark:border-gray-700`}>Scheduled</span>;
      case 'DISPATCHED':
        return <span className={`${base} bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-900/50`}>Active</span>;
      case 'COMPLETED':
        return <span className={`${base} bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/50`}>Completed</span>;
      case 'CANCELLED':
        return <span className={`${base} bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/50`}>Cancelled</span>;
      default:
        return <span className={`${base} bg-gray-100 dark:bg-gray-750 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600`}>{status}</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Trip Operations</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Schedule, dispatch, and track active transport deliveries.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open('/api/export/trips', '_blank')}
            className="flex items-center gap-2 border border-black dark:border-white bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4" />
            EXPORT CSV
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-black dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
            SCHEDULE NEW TRIP
          </button>
        </div>
      </div>

      {isTripsLoading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400 font-medium">Loading transport logs...</div>
      ) : (
        <>
          {/* Search & Filter Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Search:</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Source, destination..."
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none w-48"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:border-black dark:focus:border-white focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Scheduled (Draft)</option>
                  <option value="DISPATCHED">Active (Dispatched)</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
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

          <div className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Trip Route</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Vehicle</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Driver</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">Cargo Load</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">Distance</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">Revenue</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Lifecycle Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {trips.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                        No logged trips. Create a trip schedule to start dispatching operations.
                      </td>
                    </tr>
                  ) : filteredTrips.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                        No results match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTrips.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{t.source}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">to {t.destination}</div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{t.vehicle.name}</div>
                          <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{t.vehicle.regNumber}</div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{t.driver.name}</div>
                          <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{t.driver.licenseNumber}</div>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">{t.cargoWeight.toLocaleString()} kg</td>
                        <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">{t.plannedDistance.toLocaleString()} km</td>
                        <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                          {t.revenue !== null ? `$${t.revenue.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-center border-r border-gray-200 dark:border-gray-700">{getStatusBadge(t.status)}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {t.status === 'DRAFT' && (
                              <>
                                <button
                                  onClick={() => dispatchMutation.mutate(t.id)}
                                  className="inline-flex items-center gap-1 border border-blue-300 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                >
                                  <Play className="h-3 w-3" />
                                  DISPATCH
                                </button>
                                <button
                                  onClick={() => cancelMutation.mutate(t.id)}
                                  className="inline-flex items-center gap-1 border border-red-300 dark:border-red-950 bg-red-50 dark:bg-red-950/20 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                                >
                                  <XCircle className="h-3 w-3" />
                                  CANCEL
                                </button>
                              </>
                            )}
                            {t.status === 'DISPATCHED' && (
                              <>
                                <button
                                  onClick={() => openCompleteModal(t)}
                                  className="inline-flex items-center gap-1 border border-green-300 dark:border-green-950 bg-green-50 dark:bg-green-950/20 px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40"
                                >
                                  <Check className="h-3 w-3" />
                                  COMPLETE
                                </button>
                                <button
                                  onClick={() => cancelMutation.mutate(t.id)}
                                  className="inline-flex items-center gap-1 border border-red-300 dark:border-red-950 bg-red-50 dark:bg-red-950/20 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                                >
                                  <XCircle className="h-3 w-3" />
                                  CANCEL
                                </button>
                              </>
                            )}
                            {t.status === 'COMPLETED' && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium italic">Arrived</span>
                            )}
                            {t.status === 'CANCELLED' && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium italic">Aborted</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-opacity-60 p-4">
          <div className="w-full max-w-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-md relative">
            <button
              onClick={closeCreateModal}
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Schedule Delivery</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Assign an eligible vehicle and driver to a scheduled route.</p>
            </div>

            {actionError && (
              <div className="mb-4 border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400">
                {actionError}
              </div>
            )}

            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Source Location
                  </label>
                  <input
                    type="text"
                    {...createForm.register('source')}
                    placeholder="e.g. Depot A"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none"
                  />
                  {createForm.formState.errors.source && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {createForm.formState.errors.source.message as React.ReactNode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Destination Location
                  </label>
                  <input
                    type="text"
                    {...createForm.register('destination')}
                    placeholder="e.g. Factory B"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none"
                  />
                  {createForm.formState.errors.destination && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {createForm.formState.errors.destination.message as React.ReactNode}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Vehicle Selection
                  </label>
                  <select
                    {...createForm.register('vehicleId')}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                  >
                    <option value="">Select AVAILABLE Vehicle</option>
                    {dispatchableVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.regNumber}) - {v.odometer.toLocaleString()} km
                      </option>
                    ))}
                  </select>
                  {createForm.formState.errors.vehicleId && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {createForm.formState.errors.vehicleId.message as React.ReactNode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Driver Selection
                  </label>
                  <select
                    {...createForm.register('driverId')}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                  >
                    <option value="">Select AVAILABLE Driver</option>
                    {dispatchableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.licenseNumber})
                      </option>
                    ))}
                  </select>
                  {createForm.formState.errors.driverId && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {createForm.formState.errors.driverId.message as React.ReactNode}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Cargo Weight (kg)
                  </label>
                  <input
                    type="number"
                    {...createForm.register('cargoWeight', { valueAsNumber: true })}
                    placeholder="e.g. 1200"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none"
                  />
                  {createForm.formState.errors.cargoWeight && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {createForm.formState.errors.cargoWeight.message as React.ReactNode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Planned Distance (km)
                  </label>
                  <input
                    type="number"
                    {...createForm.register('plannedDistance', { valueAsNumber: true })}
                    placeholder="e.g. 240"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none"
                  />
                  {createForm.formState.errors.plannedDistance && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {createForm.formState.errors.plannedDistance.message as React.ReactNode}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Estimated Revenue ($)
                </label>
                <input
                  type="number"
                  {...createForm.register('revenue', { valueAsNumber: true })}
                  placeholder="e.g. 1500"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none"
                />
                {createForm.formState.errors.revenue && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {createForm.formState.errors.revenue.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-black dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100"
                >
                  SCHEDULE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE MODAL */}
      {completingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-opacity-60 p-4">
          <div className="w-full max-w-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-md relative">
            <button
              onClick={closeCompleteModal}
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Complete Trip</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Record the final odometer reading and actual revenue.</p>
            </div>

            {actionError && (
              <div className="mb-4 border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400">
                {actionError}
              </div>
            )}

            <form onSubmit={completeForm.handleSubmit(handleCompleteSubmit)} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  End Odometer Reading (km)
                </label>
                <input
                  type="number"
                  {...completeForm.register('odometerEnd', { valueAsNumber: true })}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Start Odometer was: {completingTrip.vehicle.odometer.toLocaleString()} km
                </p>
                {completeForm.formState.errors.odometerEnd && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {completeForm.formState.errors.odometerEnd.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Final Revenue ($)
                </label>
                <input
                  type="number"
                  {...completeForm.register('revenue', { valueAsNumber: true })}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                />
                {completeForm.formState.errors.revenue && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {completeForm.formState.errors.revenue.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeCompleteModal}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-black dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100"
                >
                  SUBMIT COMPLETION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Trips;
