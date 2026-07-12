import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createVehicleSchema, updateVehicleSchema, CreateVehicleInput, VehicleStatus } from 'shared';
import { api, ApiError } from '../lib/api';
import { Plus, Edit2, X, Download } from 'lucide-react';

interface Vehicle {
  id: string;
  regNumber: string;
  name: string;
  type: string;
  maxLoadCapacity: number;
  odometer: number;
  acquisitionCost: number;
  status: VehicleStatus;
  createdAt: string;
}

export const Vehicles: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch Vehicles
  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<{ status: string; vehicles: Vehicle[] }>('/vehicles'),
  });

  const vehicles = data?.vehicles || [];

  // React Hook Form config
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateVehicleInput>({
    resolver: zodResolver(editingVehicle ? updateVehicleSchema : createVehicleSchema),
    defaultValues: {
      regNumber: '',
      name: '',
      type: '',
      maxLoadCapacity: 0,
      odometer: 0,
      acquisitionCost: 0,
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newVehicle: CreateVehicleInput) => api.post('/vehicles', newVehicle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      closeModal();
    },
    onError: (err: ApiError) => {
      setSubmitError(err.message || 'Failed to create vehicle');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateVehicleInput> }) =>
      api.patch(`/vehicles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      closeModal();
    },
    onError: (err: ApiError) => {
      setSubmitError(err.message || 'Failed to update vehicle');
    },
  });

  const retireMutation = useMutation({
    mutationFn: (id: string) => api.post(`/vehicles/${id}/retire`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (err: ApiError) => {
      alert(err.message || 'Failed to retire vehicle');
    },
  });

  const openAddModal = () => {
    setEditingVehicle(null);
    setSubmitError(null);
    reset({
      regNumber: '',
      name: '',
      type: '',
      maxLoadCapacity: undefined,
      odometer: 0,
      acquisitionCost: undefined,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setSubmitError(null);
    reset({
      regNumber: vehicle.regNumber,
      name: vehicle.name,
      type: vehicle.type,
      maxLoadCapacity: vehicle.maxLoadCapacity,
      odometer: vehicle.odometer,
      acquisitionCost: vehicle.acquisitionCost,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    setSubmitError(null);
    reset();
  };

  const onSubmit = (formData: CreateVehicleInput) => {
    setSubmitError(null);
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: VehicleStatus) => {
    const base = "px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border ";
    switch (status) {
      case 'AVAILABLE':
        return <span className={`${base} bg-green-50 text-green-800 border-green-200`}>Available</span>;
      case 'ON_TRIP':
        return <span className={`${base} bg-blue-50 text-blue-800 border-blue-200`}>On Trip</span>;
      case 'IN_SHOP':
        return <span className={`${base} bg-amber-50 text-amber-800 border-amber-200`}>In Shop</span>;
      case 'RETIRED':
        return <span className={`${base} bg-gray-50 text-gray-800 border-gray-200`}>Retired</span>;
      default:
        return <span className={`${base} bg-gray-100 text-gray-800 border-gray-300`}>{status}</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vehicle Registry</h1>
          <p className="mt-1 text-sm text-gray-600">Register and manage active transportation vehicles.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open('/api/export/vehicles', '_blank')}
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
            ADD VEHICLE
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500 font-medium">Loading vehicle records...</div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Failed to load vehicles list. Please check server connections.
        </div>
      ) : (
        <div className="border border-gray-300 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50 font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3 border-r border-gray-200">Reg Number</th>
                  <th className="px-6 py-3 border-r border-gray-200">Name</th>
                  <th className="px-6 py-3 border-r border-gray-200">Type</th>
                  <th className="px-6 py-3 border-r border-gray-200 text-right">Max Load (kg)</th>
                  <th className="px-6 py-3 border-r border-gray-200 text-right">Odometer (km)</th>
                  <th className="px-6 py-3 border-r border-gray-200 text-right">Acq. Cost ($)</th>
                  <th className="px-6 py-3 border-r border-gray-200 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500 font-medium">
                      No vehicles found. Add a vehicle to get started.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-semibold text-gray-900 border-r border-gray-200">{v.regNumber}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 border-r border-gray-200">{v.name}</td>
                      <td className="px-6 py-4 text-gray-600 border-r border-gray-200">{v.type}</td>
                      <td className="px-6 py-4 text-right text-gray-900 border-r border-gray-200">{v.maxLoadCapacity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-gray-900 border-r border-gray-200">{v.odometer.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-gray-900 border-r border-gray-200">${v.acquisitionCost.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center border-r border-gray-200">{getStatusBadge(v.status)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(v)}
                            className="inline-flex items-center gap-1 border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Edit2 className="h-3 w-3" />
                            EDIT
                          </button>
                          {v.status === 'AVAILABLE' && (
                            <button
                              onClick={() => retireMutation.mutate(v.id)}
                              className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                            >
                              RETIRE
                            </button>
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

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="w-full max-w-lg border border-gray-300 bg-white p-6 shadow-md relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">Fill out the fields to register vehicle details.</p>
            </div>

            {submitError && (
              <div className="mb-4 border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Reg Number
                  </label>
                  <input
                    type="text"
                    {...register('regNumber')}
                    placeholder="e.g. REG-123"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none uppercase"
                  />
                  {errors.regNumber && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.regNumber.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Vehicle Name
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="e.g. Toyota Hiace"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Type
                  </label>
                  <input
                    type="text"
                    {...register('type')}
                    placeholder="e.g. Van, Truck"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {errors.type && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Max Load Capacity (kg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('maxLoadCapacity', { valueAsNumber: true })}
                    placeholder="e.g. 1500"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {errors.maxLoadCapacity && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.maxLoadCapacity.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Odometer (km)
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('odometer', { valueAsNumber: true })}
                    placeholder="e.g. 0"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {errors.odometer && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.odometer.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Acquisition Cost ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('acquisitionCost', { valueAsNumber: true })}
                    placeholder="e.g. 35000"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {errors.acquisitionCost && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.acquisitionCost.message}</p>
                  )}
                </div>
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
                  {editingVehicle ? 'SAVE CHANGES' : 'CREATE VEHICLE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Vehicles;
