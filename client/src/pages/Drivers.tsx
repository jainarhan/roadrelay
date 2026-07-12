import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDriverSchema, updateDriverSchema, CreateDriverInput, DriverStatus } from 'shared';
import { api, ApiError } from '../lib/api';
import { Plus, Edit2, X, Download } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: string; // ISO date string
  contact: string;
  safetyScore: number;
  status: DriverStatus;
  createdAt: string;
}

export const Drivers: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch Drivers
  const { data, isLoading, error } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.get<{ status: string; drivers: Driver[] }>('/drivers'),
  });

  const drivers = data?.drivers || [];

  // React Hook Form config
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(editingDriver ? updateDriverSchema : createDriverSchema),
    defaultValues: {
      name: '',
      licenseNumber: '',
      licenseCategory: '',
      licenseExpiry: '',
      contact: '',
      safetyScore: 100,
      status: 'AVAILABLE',
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newDriver: CreateDriverInput) => api.post('/drivers', newDriver),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      closeModal();
    },
    onError: (err: ApiError) => {
      setSubmitError(err.message || 'Failed to create driver');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDriverInput> }) =>
      api.patch(`/drivers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      closeModal();
    },
    onError: (err: ApiError) => {
      setSubmitError(err.message || 'Failed to update driver');
    },
  });

  const openAddModal = () => {
    setEditingDriver(null);
    setSubmitError(null);
    reset({
      name: '',
      licenseNumber: '',
      licenseCategory: '',
      licenseExpiry: '',
      contact: '',
      safetyScore: 100,
      status: 'AVAILABLE',
    });
    setIsModalOpen(true);
  };

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    return isoString.substring(0, 10);
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setSubmitError(null);
    reset({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      licenseCategory: driver.licenseCategory,
      licenseExpiry: formatDateForInput(driver.licenseExpiry) as any,
      contact: driver.contact,
      safetyScore: driver.safetyScore,
      status: driver.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
    setSubmitError(null);
    reset();
  };

  const onSubmit = (formData: any) => {
    setSubmitError(null);
    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: DriverStatus) => {
    const base = "px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border ";
    switch (status) {
      case 'AVAILABLE':
        return <span className={`${base} bg-green-50 text-green-800 border-green-200`}>Available</span>;
      case 'ON_TRIP':
        return <span className={`${base} bg-blue-50 text-blue-800 border-blue-200`}>On Trip</span>;
      case 'OFF_DUTY':
        return <span className={`${base} bg-gray-50 text-gray-800 border-gray-200`}>Off Duty</span>;
      case 'SUSPENDED':
        return <span className={`${base} bg-red-50 text-red-800 border-red-200`}>Suspended</span>;
      default:
        return <span className={`${base} bg-gray-100 text-gray-800 border-gray-300`}>{status}</span>;
    }
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Driver Management</h1>
          <p className="mt-1 text-sm text-gray-600">Register and manage operational transit drivers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open('/api/export/drivers', '_blank')}
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
            ADD DRIVER
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500 font-medium">Loading driver records...</div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Failed to load drivers list. Please check server connections.
        </div>
      ) : (
        <div className="border border-gray-300 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50 font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3 border-r border-gray-200">Name</th>
                  <th className="px-6 py-3 border-r border-gray-200">License Number</th>
                  <th className="px-6 py-3 border-r border-gray-200">Category</th>
                  <th className="px-6 py-3 border-r border-gray-200">License Expiry</th>
                  <th className="px-6 py-3 border-r border-gray-200">Contact</th>
                  <th className="px-6 py-3 border-r border-gray-200 text-right">Safety Score</th>
                  <th className="px-6 py-3 border-r border-gray-200 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500 font-medium">
                      No drivers found. Add a driver to get started.
                    </td>
                  </tr>
                ) : (
                  drivers.map((d) => {
                    const isLicenseExpired = new Date(d.licenseExpiry) < new Date();
                    return (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-900 border-r border-gray-200">{d.name}</td>
                        <td className="px-6 py-4 font-mono text-gray-900 border-r border-gray-200">{d.licenseNumber}</td>
                        <td className="px-6 py-4 text-gray-600 border-r border-gray-200">{d.licenseCategory}</td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <span className={isLicenseExpired ? "text-red-600 font-semibold" : "text-gray-900"}>
                            {formatDateDisplay(d.licenseExpiry)}
                            {isLicenseExpired && " (EXPIRED)"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 border-r border-gray-200">{d.contact}</td>
                        <td className="px-6 py-4 text-right border-r border-gray-200">
                          <span className={`font-semibold ${d.safetyScore >= 80 ? 'text-green-600' : d.safetyScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            {d.safetyScore}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center border-r border-gray-200">{getStatusBadge(d.status)}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openEditModal(d)}
                            className="inline-flex items-center gap-1 border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Edit2 className="h-3. w-3" />
                            EDIT
                          </button>
                        </td>
                      </tr>
                    );
                  })
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
                {editingDriver ? 'Edit Driver' : 'Add New Driver'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">Fill out the fields to register driver credentials.</p>
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
                    Full Name
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="e.g. John Doe"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.name.message as React.ReactNode}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    License Number
                  </label>
                  <input
                    type="text"
                    {...register('licenseNumber')}
                    placeholder="e.g. LIC-12345"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none uppercase"
                  />
                  {errors.licenseNumber && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.licenseNumber.message as React.ReactNode}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    License Category
                  </label>
                  <input
                    type="text"
                    {...register('licenseCategory')}
                    placeholder="e.g. Heavy Rigid"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {errors.licenseCategory && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.licenseCategory.message as React.ReactNode}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    License Expiry
                  </label>
                  <input
                    type="date"
                    {...register('licenseExpiry')}
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
                  />
                  {errors.licenseExpiry && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.licenseExpiry.message as React.ReactNode}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Contact Info
                  </label>
                  <input
                    type="text"
                    {...register('contact')}
                    placeholder="e.g. +123456789"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {errors.contact && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.contact.message as React.ReactNode}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                    Safety Score (0 - 100)
                  </label>
                  <input
                    type="number"
                    {...register('safetyScore', { valueAsNumber: true })}
                    placeholder="e.g. 100"
                    className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                  {errors.safetyScore && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.safetyScore.message as React.ReactNode}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="mt-1 block w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_TRIP">On Trip</option>
                  <option value="OFF_DUTY">Off Duty</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.status.message as React.ReactNode}</p>
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
                  {editingDriver ? 'SAVE CHANGES' : 'CREATE DRIVER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Drivers;
