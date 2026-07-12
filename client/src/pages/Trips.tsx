import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTripSchema, completeTripSchema, CreateTripInput, CompleteTripInput, TripStatus } from 'shared';
import { api, ApiError } from '../lib/api';
import { Plus, Check, Play, XCircle, X } from 'lucide-react';

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
        return <span className={`${base} bg-gray-50 text-gray-800 border-gray-200`}>Scheduled</span>;
      case 'DISPATCHED':
        return <span className={`${base} bg-blue-50 text-blue-800 border-blue-200`}>Active</span>;
      case 'COMPLETED':
        return <span className={`${base} bg-green-50 text-green-800 border-green-200`}>Completed</span>;
      case 'CANCELLED':
        return <span className={`${base} bg-red-50 text-red-800 border-red-200`}>Cancelled</span>;
      default:
        return <span className={`${base} bg-gray-100 text-gray-800 border-gray-300`}>{status}</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Trip Operations</h1>
          <p className="mt-1 text-sm text-gray-600">Schedule, dispatch, and track active transport deliveries.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          SCHEDULE NEW TRIP
        </button>
      </div>

      {isTripsLoading ? (
        <div className="py-12 text-center text-gray-500 font-medium">Loading transport logs...</div>
      ) : (
        <div className="border border-gray-300 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50 font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3 border-r border-gray-200">Trip Route</th>
                  <th className="px-6 py-3 border-r border-gray-200">Vehicle</th>
                  <th className="px-6 py-3 border-r border-gray-200">Driver</th>
                  <th className="px-6 py-3 border-r border-gray-200 text-right">Cargo Load</th>
                  <th className="px-6 py-3 border-r border-gray-200 text-right">Distance</th>
                  <th className="px-6 py-3 border-r border-gray-200 text-right">Revenue</th>
                  <th className="px-6 py-3 border-r border-gray-200 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Lifecycle Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500 font-medium">
                      No logged trips. Create a trip schedule to start dispatching operations.
                    </td>
                  </tr>
                ) : (
                  trips.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="font-semibold text-gray-900">{t.source}</div>
                        <div className="text-xs text-gray-500 mt-0.5">to {t.destination}</div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="font-medium text-gray-900">{t.vehicle.name}</div>
                        <div className="text-xs font-mono text-gray-500 mt-0.5">{t.vehicle.regNumber}</div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="font-medium text-gray-900">{t.driver.name}</div>
                        <div className="text-xs font-mono text-gray-500 mt-0.5">{t.driver.licenseNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 border-r border-gray-200">{t.cargoWeight.toLocaleString()} kg</td>
                      <td className="px-6 py-4 text-right text-gray-900 border-r border-gray-200">{t.plannedDistance.toLocaleString()} km</td>
                      <td className="px-6 py-4 text-right text-gray-900 border-r border-gray-200">
                        {t.revenue !== null ? `$${t.revenue.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-center border-r border-gray-200">{getStatusBadge(t.status)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {t.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => dispatchMutation.mutate(t.id)}
                                className="inline-flex items-center gap-1 border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                <Play className="h-3 w-3" />
                                DISPATCH
                              </button>
                              <button
                                onClick={() => cancelMutation.mutate(t.id)}
                                className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
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
                                className="inline-flex items-center gap-1 border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                              >
                                <Check className="h-3 w-3" />
                                COMPLETE
                              </button>
                              <button
                                onClick={() => cancelMutation.mutate(t.id)}
                                className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                              >
                                <XCircle className="h-3 w-3" />
                                CANCEL
                              </button>
                            </>
                          )}
                          {t.status === 'COMPLETED' && (
                            <span className="text-xs text-gray-500 font-medium italic">Arrived</span>
                          )}
                          {t.status === 'CANCELLED' && (
                            <span className="text-xs text-gray-500 font-medium italic">Aborted</span>
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
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="w-full max-w-lg border border-gray-300 bg-white p-6 shadow-md relative">
            <button
              onClick={closeCreateModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">Schedule Delivery</h2>
              <p className="text-xs text-gray-500 mt-1">Assign an eligible vehicle and driver to a scheduled route.</p>
            </div>

            {actionError && (
              <div className="mb-4 border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {actionError}
              </div>
            )}

            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Source Location
                  </label>
                  <input
                    type="text"
                    {...createForm.register('source')}
                    placeholder="e.g. Depot A"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {createForm.formState.errors.source && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {createForm.formState.errors.source.message as React.ReactNode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Destination Location
                  </label>
                  <input
                    type="text"
                    {...createForm.register('destination')}
                    placeholder="e.g. Factory B"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
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
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Vehicle Selection
                  </label>
                  <select
                    {...createForm.register('vehicleId')}
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
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
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Driver Selection
                  </label>
                  <select
                    {...createForm.register('driverId')}
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
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
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Cargo Weight (kg)
                  </label>
                  <input
                    type="number"
                    {...createForm.register('cargoWeight', { valueAsNumber: true })}
                    placeholder="e.g. 1200"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {createForm.formState.errors.cargoWeight && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {createForm.formState.errors.cargoWeight.message as React.ReactNode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Planned Distance (km)
                  </label>
                  <input
                    type="number"
                    {...createForm.register('plannedDistance', { valueAsNumber: true })}
                    placeholder="e.g. 240"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {createForm.formState.errors.plannedDistance && (
                    <p className="mt-1 text-xs text-red-600 font-medium">
                      {createForm.formState.errors.plannedDistance.message as React.ReactNode}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                  Estimated Revenue ($)
                </label>
                <input
                  type="number"
                  {...createForm.register('revenue', { valueAsNumber: true })}
                  placeholder="e.g. 1500"
                  className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                />
                {createForm.formState.errors.revenue && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {createForm.formState.errors.revenue.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="w-full max-w-md border border-gray-300 bg-white p-6 shadow-md relative">
            <button
              onClick={closeCompleteModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">Complete Trip</h2>
              <p className="text-xs text-gray-500 mt-1">Record the final odometer reading and actual revenue.</p>
            </div>

            {actionError && (
              <div className="mb-4 border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {actionError}
              </div>
            )}

            <form onSubmit={completeForm.handleSubmit(handleCompleteSubmit)} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                  End Odometer Reading (km)
                </label>
                <input
                  type="number"
                  {...completeForm.register('odometerEnd', { valueAsNumber: true })}
                  className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Start Odometer was: {completingTrip.vehicle.odometer.toLocaleString()} km
                </p>
                {completeForm.formState.errors.odometerEnd && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {completeForm.formState.errors.odometerEnd.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                  Final Revenue ($)
                </label>
                <input
                  type="number"
                  {...completeForm.register('revenue', { valueAsNumber: true })}
                  className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
                />
                {completeForm.formState.errors.revenue && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    {completeForm.formState.errors.revenue.message as React.ReactNode}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeCompleteModal}
                  className="border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
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
