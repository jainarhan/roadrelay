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
  licenseExpiry: string;
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

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Extract unique license categories dynamically
  const uniqueCategories = React.useMemo(() => {
    const cats = new Set(drivers.map((d) => d.licenseCategory));
    return Array.from(cats).sort();
  }, [drivers]);

  // Client-side filtering via useMemo
  const filteredDrivers = React.useMemo(() => {
    return drivers.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || d.licenseCategory === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [drivers, searchQuery, statusFilter, categoryFilter]);

  const isFilterActive = searchQuery !== '' || statusFilter !== 'ALL' || categoryFilter !== 'ALL';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
  };

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
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
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
        return <span className={`${base} bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/50`}>Available</span>;
      case 'ON_TRIP':
        return <span className={`${base} bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-900/50`}>On Trip</span>;
      case 'OFF_DUTY':
        return <span className={`${base} bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700`}>Off Duty</span>;
      case 'SUSPENDED':
        return <span className={`${base} bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/50`}>Suspended</span>;
      default:
        return <span className={`${base} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600`}>{status}</span>;
    }
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Driver Management</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Register and manage operational transit drivers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open('/api/export/drivers', '_blank')}
            className="flex items-center gap-2 border border-black dark:border-white bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4" />
            EXPORT CSV
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-black dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
            ADD DRIVER
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400 font-medium">Loading driver records...</div>
      ) : error ? (
        <div className="border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-600 dark:text-red-400">
          Failed to load drivers list. Please check server connections.
        </div>
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
                  placeholder="Name or license..."
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
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_TRIP">On Trip</option>
                  <option value="OFF_DUTY">Off Duty</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:border-black dark:focus:border-white focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
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
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Name</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">License Number</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Category</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">License Expiry</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700">Contact</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-right">Safety Score</th>
                    <th className="px-6 py-3 border-r border-gray-200 dark:border-gray-700 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {drivers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                        No drivers found. Add a driver to get started.
                      </td>
                    </tr>
                  ) : filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                        No results match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((d) => {
                      const isLicenseExpired = new Date(d.licenseExpiry) < new Date();
                      return (
                        <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">{d.name}</td>
                          <td className="px-6 py-4 font-mono text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">{d.licenseNumber}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">{d.licenseCategory}</td>
                          <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">
                            <span className={isLicenseExpired ? "text-red-650 dark:text-red-400 font-semibold" : "text-gray-900 dark:text-gray-100"}>
                              {formatDateDisplay(d.licenseExpiry)}
                              {isLicenseExpired && " (EXPIRED)"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">{d.contact}</td>
                          <td className="px-6 py-4 text-right border-r border-gray-200 dark:border-gray-700">
                            <span className={`font-semibold ${d.safetyScore >= 80 ? 'text-green-600 dark:text-green-400' : d.safetyScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                              {d.safetyScore}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center border-r border-gray-200 dark:border-gray-700">{getStatusBadge(d.status)}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => openEditModal(d)}
                              className="inline-flex items-center gap-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
        </>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-opacity-60 p-4">
          <div className="w-full max-w-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-md relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editingDriver ? 'Edit Driver' : 'Add New Driver'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fill out the fields to register driver credentials.</p>
            </div>

            {submitError && (
              <div className="mb-4 border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="e.g. John Doe"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.name.message as React.ReactNode}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    License Number
                  </label>
                  <input
                    type="text"
                    {...register('licenseNumber')}
                    placeholder="e.g. LIC-12345"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none uppercase"
                  />
                  {errors.licenseNumber && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.licenseNumber.message as React.ReactNode}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    License Category
                  </label>
                  <input
                    type="text"
                    {...register('licenseCategory')}
                    placeholder="e.g. Heavy Rigid"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none"
                  />
                  {errors.licenseCategory && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.licenseCategory.message as React.ReactNode}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    License Expiry
                  </label>
                  <input
                    type="date"
                    {...register('licenseExpiry')}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
                  />
                  {errors.licenseExpiry && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.licenseExpiry.message as React.ReactNode}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Contact Info
                  </label>
                  <input
                    type="text"
                    {...register('contact')}
                    placeholder="e.g. +123456789"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none"
                  />
                  {errors.contact && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.contact.message as React.ReactNode}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Safety Score (0 - 100)
                  </label>
                  <input
                    type="number"
                    {...register('safetyScore', { valueAsNumber: true })}
                    placeholder="e.g. 100"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-black dark:focus:border-white focus:outline-none"
                  />
                  {errors.safetyScore && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.safetyScore.message as React.ReactNode}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-black dark:focus:border-white focus:outline-none"
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

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-black dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100"
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
